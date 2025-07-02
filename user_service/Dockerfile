FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files (including TypeScript)
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Add wait-for script to handle DB/Kafka availability
COPY wait-for.sh ./wait-for.sh
RUN chmod +x ./wait-for.sh

# Expose the application port
EXPOSE 8000

# Final startup command: wait for DB and Kafka, then run the app
CMD ["./wait-for.sh", "user_db:5432", "--", "./wait-for.sh", "kafka:9092", "--", "node", "dist/main.js"]
