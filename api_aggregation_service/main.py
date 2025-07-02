# main.py

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from redis.asyncio import Redis
from motor.motor_asyncio import AsyncIOMotorClient
from confluent_kafka import Consumer, Producer
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
import httpx
import os
import json
import asyncio
import threading

app = FastAPI()

# Redis setup
REDIS_URL = os.getenv("REDIS_URL", "redis://api_cache:6379/0")
redis = Redis.from_url(REDIS_URL, decode_responses=True)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://api_db:27017/api_db")
mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client["api_db"]
collection = db["aggregated_data"]

# Kafka setup
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
print(f"Connecting to Kafka at: {KAFKA_BOOTSTRAP_SERVERS}")
consumer = Consumer({
    'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS,
    'group.id': 'api_aggregation_group',
    'auto.offset.reset': 'earliest'
})
producer = Producer({'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS})
print("Subscribing to topic: api.request")
consumer.subscribe(['api.request'])
print("Kafka setup completed")

# JWT setup
SECRET_KEY = os.getenv("SECRET_KEY", "62e3e92d827f00b404c92698070d0a0e2e19f0d7c6c93cdfb50c5e12a40b5c416e76ea027bf7fd00331db0c50fe4ce6843862d3acd354c374263eacab68fa309")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AggregateRequest(BaseModel):
    user_id: str
    product_ids: list[str]

class AggregateResponse(BaseModel):
    user: dict
    products: list[dict]

async def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def process_kafka_messages():
    print("Starting Kafka message processing loop")
    async with httpx.AsyncClient() as client:
        while True:
            print("Polling for Kafka messages...")
            msg = consumer.poll(1.0)
            if msg is None:
                await asyncio.sleep(0.1)
                continue
            if msg.error():
                print(f"Consumer error: {msg.error()}")
                continue

            print(f"Received message from topic: {msg.topic()}, partition: {msg.partition()}, offset: {msg.offset()}")
            try:
                message_value = msg.value().decode('utf-8')
                print(f"Message value: {message_value}")
                data = json.loads(message_value)
                user_id = data.get('user_id')
                product_ids = data.get('product_ids', [])
                print(f"Processing request for user_id: {user_id}, product_ids: {product_ids}")

                # Cache check
                cached = await redis.get(f"aggregate:{user_id}")
                if cached:
                    print(f"Cache hit for user_id: {user_id}, sending cached response")
                    producer.produce('api.response', cached.encode('utf-8'))
                    producer.flush()
                    print(f"Sent cached response to topic: api.response")
                    continue
                print(f"Cache miss for user_id: {user_id}, fetching data from services")

                # Fetch user data
                user_response = await client.get(
                    "http://user_service:8000/users/profile",
                    headers={"Authorization": f"Bearer {data.get('token')}"},
                    params={"email": data.get('email')}
                )
                user_data = user_response.json() if user_response.status_code == 200 else {}

                # Fetch product data
                products = []
                for product_id in product_ids:
                    product_response = await client.get(
                        f"http://product_service:8001/products/{product_id}",
                        headers={"Authorization": f"Bearer {data.get('token')}"}
                    )
                    if product_response.status_code == 200:
                        products.append(product_response.json())

                result = {"user": user_data, "products": products}
                print(f"Aggregated data for user_id: {user_id}, saving to MongoDB")
                await collection.insert_one(result)
                print(f"Saving to Redis cache with key: aggregate:{user_id}")
                await redis.setex(f"aggregate:{user_id}", 3600, json.dumps(result))

                print(f"Sending aggregated response to topic: api.response")
                producer.produce('api.response', json.dumps(result).encode('utf-8'))
                producer.flush()
                print(f"Response sent successfully to topic: api.response")

            except Exception as e:
                print(f"Error processing Kafka message: {str(e)}")
                print(f"Error type: {type(e).__name__}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")

def kafka_thread():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(process_kafka_messages())

@app.on_event("startup")
async def start_kafka_consumer():
    threading.Thread(target=kafka_thread, daemon=True).start()

@app.post("/ ", response_model=AggregateResponse)
async def aggregate_data(request: AggregateRequest, token: str = Depends(verify_token)):
    print(f"Received API request for user_id: {request.user_id}, product_ids: {request.product_ids}")
    message = {
        "user_id": request.user_id,
        "product_ids": request.product_ids,
        "token": token
    }
    print(f"Sending message to topic: api.request, message: {json.dumps(message)}")
    producer.produce('api.request', json.dumps(message).encode('utf-8'))
    producer.flush()
    print(f"Message sent to Kafka topic: api.request")
    return {"user": {}, "products": []}  # Placeholder until async processing completes

@app.on_event("shutdown")
async def shutdown_event():
    await redis.close()
    mongo_client.close()
    consumer.close()
