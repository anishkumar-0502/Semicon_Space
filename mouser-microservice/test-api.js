const axios = require('axios');

// Test the GET endpoint
async function testGetEndpoint() {
    try {
        const partNumber = '595-TPS54331DR'; // Example part number
        console.log(`Testing GET /api/parts/${partNumber}`);

        const response = await axios.get(`http://localhost:3000/api/parts/${partNumber}`);
        console.log('GET Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('GET Error:', error.response ? error.response.data : error.message);
    }
}

// Test the POST endpoint
async function testPostEndpoint() {
    try {
        const partNumber = '595-TPS54331DR'; // Example part number
        console.log(`Testing POST /api/parts/search with partNumber=${partNumber}`);

        const response = await axios.post('http://localhost:3000/api/parts/search', {
            partNumber: partNumber
        });
        console.log('POST Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('POST Error:', error.response ? error.response.data : error.message);
    }
}

// Test the GET all parts endpoint
async function testGetAllParts() {
    try {
        console.log('Testing GET /api/parts');

        const response = await axios.get('http://localhost:3000/api/parts');
        console.log(`Found ${response.data.length} parts in the database`);
        if (response.data.length > 0) {
            console.log('First part:', JSON.stringify(response.data[0], null, 2));
        }
        return response.data;
    } catch (error) {
        console.error('GET All Error:', error.response ? error.response.data : error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('=== Starting API Tests ===');
    await testGetEndpoint();
    console.log('-------------------------');
    await testPostEndpoint();
    console.log('-------------------------');
    await testGetAllParts();
    console.log('=== Tests Completed ===');
}

runTests();