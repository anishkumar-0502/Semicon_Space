require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/mouser_db')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schema for storing part search results
const partSchema = new mongoose.Schema({
    mouserPartNumber: String,
    description: String,
    manufacturer: String,
    price: String,
    availability: String,
    createdAt: { type: Date, default: Date.now },
});

const Part = mongoose.model('Part', partSchema);

// Mouser API Configuration
const MOUSER_API_KEY = process.env.MOUSER_API_KEY || '7980773b-3206-4ff7-a539-9555e3d9746e'; // Fallback for development
const MOUSER_API_BASE_URL = 'https://api.mouser.com/api/v1';

// Mock data for when API key is invalid
const MOCK_PART_DATA = {
    MouserPartNumber: 'MOCK-12345',
    Description: 'Mock Electronic Component',
    Manufacturer: 'Mock Manufacturer',
    PriceBreaks: [{ Price: '$9.99', Quantity: 1 }],
    Availability: 'In Stock: 1000'
};

// Helper function to create a mock part based on part number
function createMockPart(partNumber) {
    return {
        ...MOCK_PART_DATA,
        MouserPartNumber: partNumber || MOCK_PART_DATA.MouserPartNumber
    };
}

// Helper function to fetch REST data with retry logic
async function fetchRestData(url, data, maxRetries = 3) {
    let attempt = 0;

    console.log(`Attempting to fetch data from ${url}`);
    while (attempt < maxRetries) {
        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Ocp-Apim-Subscription-Key': MOUSER_API_KEY
                }
            });

            return response.data;

        } catch (error) {
            attempt++;
            if (attempt === maxRetries) throw error;
            console.warn(`Attempt ${attempt} failed for ${url}, retrying...`, error.message, error.response?.data || 'No response data');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
    }
}

// API Endpoint: Search for a part by part number
app.get('/api/parts/:partNumber', async (req, res) => {
    const { partNumber } = req.params;
    console.log('GET search for part number:', partNumber);

    if (!partNumber || partNumber.trim() === '') {
        return res.status(400).json({ error: 'Part number is required' });
    }

    try {
        let part = await Part.findOne({ mouserPartNumber: partNumber });
        if (part) {
            console.log('Part found in cache:', part);
            return res.json({ source: 'cache', data: part });
        }

        console.log('Part not found in cache, querying Mouser API');

        try {
            const requestBody = {
                SearchByPartRequest: {
                    mouserPartNumber: partNumber,
                    partSearchOptions: 'Exact'
                }
            };

            console.log('Mouser API partnumber request:', JSON.stringify(requestBody));
            const result = await fetchRestData(`${MOUSER_API_BASE_URL}/search/partnumber`, requestBody);
            if (!result.Errors && result.SearchResults && result.SearchResults.Parts && result.SearchResults.Parts.length > 0) {
                const partData = result.SearchResults.Parts[0];
                console.log('Part data from Mouser API (partnumber):', partData);
                part = new Part({
                    mouserPartNumber: partData.MouserPartNumber,
                    description: partData.Description,
                    manufacturer: partData.Manufacturer,
                    price: partData.PriceBreaks && partData.PriceBreaks.length > 0 ? partData.PriceBreaks[0].Price : 'N/A',
                    availability: partData.Availability || 'N/A',
                });
                await part.save();
                console.log('Part saved to MongoDB');
                return res.json({ source: 'mouser-api-partnumber', data: part });
            }
            console.log('Partnumber search unsuccessful, trying keyword search');
        } catch (partNumberError) {
            console.error('Error in partnumber search:', partNumberError.message);
        }

        try {
            const keywordRequestBody = {
                SearchByKeywordRequest: {
                    keyword: partNumber,
                    records: 1,
                    startingRecord: 0,
                    searchOptions: '',
                    searchWithYourSignUpLanguage: 'false'
                }
            };

            console.log('Mouser API keyword request:', JSON.stringify(keywordRequestBody));
            const keywordResult = await fetchRestData(`${MOUSER_API_BASE_URL}/search/keyword`, keywordRequestBody);
            if (keywordResult.Errors && keywordResult.Errors.length > 0) {
                console.error('Mouser API keyword error:', keywordResult.Errors[0].Message);
                if (keywordResult.Errors[0].Message === 'Invalid unique identifier.' ||
                    keywordResult.Errors[0].PropertyName === 'API Key') {
                    console.log('Using mock data due to API key issue');
                    const mockPartData = createMockPart(partNumber);
                    part = new Part({
                        mouserPartNumber: mockPartData.MouserPartNumber,
                        description: mockPartData.Description,
                        manufacturer: mockPartData.Manufacturer,
                        price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
                        availability: mockPartData.Availability || 'N/A',
                    });
                    await part.save();
                    console.log('Mock part saved to MongoDB');
                    return res.json({ source: 'mock-data', data: part });
                }
                return res.status(400).json({ error: keywordResult.Errors[0].Message });
            }

            if (!keywordResult.SearchResults || !keywordResult.SearchResults.Parts || keywordResult.SearchResults.Parts.length === 0) {
                console.log('Part not found in Mouser API (keyword search)');
                return res.status(404).json({ error: 'Part not found' });
            }

            const keywordPartData = keywordResult.SearchResults.Parts[0];
            console.log('Part data from Mouser API (keyword):', keywordPartData);
            part = new Part({
                mouserPartNumber: keywordPartData.MouserPartNumber,
                description: keywordPartData.Description,
                manufacturer: keywordPartData.Manufacturer,
                price: keywordResult.PriceBreaks && keywordResult.PriceBreaks.length > 0 ? keywordResult.PriceBreaks[0].Price : 'N/A',
                availability: keywordPartData.Availability || 'N/A',
            });
            await part.save();
            console.log('Part saved to MongoDB');
            return res.json({ source: 'mouser-api-keyword', data: part });
        } catch (error) {
            console.error('Error in keyword search:', error.message);
            console.log('All API calls failed, using mock data');
            const mockPartData = createMockPart(partNumber);
            part = new Part({
                mouserPartNumber: mockPartData.MouserPartNumber,
                description: mockPartData.Description,
                manufacturer: mockPartData.Manufacturer,
                price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
                availability: mockPartData.Availability || 'N/A',
            });
            await part.save();
            console.log('Mock part saved to MongoDB');
            return res.json({ source: 'mock-data-fallback', data: part });
        }
    } catch (error) {
        console.error('Error searching part:', error.message);
        console.log('Error occurred, using mock data as final fallback');
        const mockPartData = createMockPart(partNumber);
        part = new Part({
            mouserPartNumber: mockPartData.MouserPartNumber,
            description: mockPartData.Description,
            manufacturer: mockPartData.Manufacturer,
            price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
            availability: mockPartData.Availability || 'N/A',
        });
        await part.save();
        console.log('Mock part saved to MongoDB');
        return res.json({ source: 'mock-data-error-fallback', data: part });
    }
});

// API Endpoint: Get all stored parts
app.get('/api/parts', async (req, res) => {
    try {
        const parts = await Part.find().sort({ createdAt: -1 });
        res.json(parts);
    } catch (error) {
        console.error('Error fetching parts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API Endpoint: Search for a part by part number (POST method)
app.post('/api/parts/search', async (req, res) => {
    const { partNumber } = req.body;
    console.log('POST search for part number:', partNumber);

    if (!partNumber || partNumber.trim() === '') {
        return res.status(400).json({ error: 'Part number is required in request body' });
    }

    try {
        let part = await Part.findOne({ mouserPartNumber: partNumber });
        if (part) {
            console.log('Part found in cache:', part);
            return res.json({ source: 'cache', data: part });
        }

        console.log('Part not found in cache, querying Mouser API');

        try {
            const requestBody = {
                SearchByPartRequest: {
                    mouserPartNumber: partNumber,
                    partSearchOptions: 'Exact'
                }
            };

            console.log('Mouser API partnumber request:', JSON.stringify(requestBody));
            const result = await fetchRestData(`${MOUSER_API_BASE_URL}/search/partnumber`, requestBody);
            if (!result.Errors && result.SearchResults && result.SearchResults.Parts && result.SearchResults.Parts.length > 0) {
                const partData = result.SearchResults.Parts[0];
                console.log('Part data from Mouser API (partnumber):', partData);
                part = new Part({
                    mouserPartNumber: partData.MouserPartNumber,
                    description: partData.Description,
                    manufacturer: partData.Manufacturer,
                    price: partData.PriceBreaks && partData.PriceBreaks.length > 0 ? partData.PriceBreaks[0].Price : 'N/A',
                    availability: partData.Availability || 'N/A',
                });
                await part.save();
                console.log('Part saved to MongoDB');
                return res.json({ source: 'mouser-api-partnumber', data: part });
            }
            console.log('Partnumber search unsuccessful, trying keyword search');
        } catch (partNumberError) {
            console.error('Error in partnumber search:', partNumberError.message);
        }

        try {
            const keywordRequestBody = {
                SearchByKeywordRequest: {
                    keyword: partNumber,
                    records: 1,
                    startingRecord: 0,
                    searchOptions: '',
                    searchWithYourSignUpLanguage: 'false'
                }
            };

            console.log('Mouser API keyword request:', JSON.stringify(keywordRequestBody));
            const keywordResult = await fetchRestData(`${MOUSER_API_BASE_URL}/search/keyword`, keywordRequestBody);
            if (keywordResult.Errors && keywordResult.Errors.length > 0) {
                console.error('Mouser API keyword error:', keywordResult.Errors[0].Message);
                if (keywordResult.Errors[0].Message === 'Invalid unique identifier.' ||
                    keywordResult.Errors[0].PropertyName === 'API Key') {
                    console.log('Using mock data due to API key issue');
                    const mockPartData = createMockPart(partNumber);
                    part = new Part({
                        mouserPartNumber: mockPartData.MouserPartNumber,
                        description: mockPartData.Description,
                        manufacturer: mockPartData.Manufacturer,
                        price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
                        availability: mockPartData.Availability || 'N/A',
                    });
                    await part.save();
                    console.log('Mock part saved to MongoDB');
                    return res.json({ source: 'mock-data', data: part });
                }
                return res.status(400).json({ error: keywordResult.Errors[0].Message });
            }

            if (!keywordResult.SearchResults || !keywordResult.SearchResults.Parts || keywordResult.SearchResults.Parts.length === 0) {
                console.log('Part not found in Mouser API (keyword search)');
                return res.status(404).json({ error: 'Part not found' });
            }

            const keywordPartData = keywordResult.SearchResults.Parts[0];
            console.log('Part data from Mouser API (keyword):', keywordPartData);
            part = new Part({
                mouserPartNumber: keywordPartData.MouserPartNumber,
                description: keywordPartData.Description,
                manufacturer: keywordPartData.Manufacturer,
                price: keywordResult.PriceBreaks && keywordResult.PriceBreaks.length > 0 ? keywordResult.PriceBreaks[0].Price : 'N/A',
                availability: keywordPartData.Availability || 'N/A',
            });
            await part.save();
            console.log('Part saved to MongoDB');
            return res.json({ source: 'mouser-api-keyword', data: part });
        } catch (error) {
            console.error('Error in keyword search:', error.message);
            console.log('All API calls failed, using mock data');
            const mockPartData = createMockPart(partNumber);
            part = new Part({
                mouserPartNumber: mockPartData.MouserPartNumber,
                description: mockPartData.Description,
                manufacturer: mockPartData.Manufacturer,
                price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
                availability: mockPartData.Availability || 'N/A',
            });
            await part.save();
            console.log('Mock part saved to MongoDB');
            return res.json({ source: 'mock-data-fallback', data: part });
        }
    } catch (error) {
        console.error('Error searching part:', error.message);
        console.log('Error occurred, using mock data as final fallback');
        const mockPartData = createMockPart(partNumber);
        part = new Part({
            mouserPartNumber: mockPartData.MouserPartNumber,
            description: mockPartData.Description,
            manufacturer: mockPartData.Manufacturer,
            price: mockPartData.PriceBreaks && mockPartData.PriceBreaks.length > 0 ? mockPartData.PriceBreaks[0].Price : 'N/A',
            availability: mockPartData.Availability || 'N/A',
        });
        await part.save();
        console.log('Mock part saved to MongoDB');
        return res.json({ source: 'mock-data-error-fallback', data: part });
    }
});

// New API Endpoint: Trigger saving all parts from Mouser to DB
app.post('/api/parts/save-all', async (req, res) => {
    console.log('Triggering save all parts from Mouser API at', new Date().toISOString());

    try {
        let startingRecord = 0;
        const recordsPerPage = 3; // Adjust based on API limits
        let totalPartsSaved = 0;
        let hasMoreParts = true;

        while (hasMoreParts) {
            const requestBody = {
                SearchByKeywordRequest: {
                    keyword: 'LED', // Broad but valid keyword
                    records: recordsPerPage,
                    startingRecord: startingRecord,
                    searchOptions: "string",
                    searchWithYourSignUpLanguage: "string"
                }
            };
            console.log('Mouser API keyword request:', JSON.stringify(requestBody));
            console.log(`Fetching parts - Starting record: ${startingRecord}, Records per page: ${recordsPerPage} `);
            const result = await fetchRestData(`${MOUSER_API_BASE_URL}/search/keyword?apiKey=${MOUSER_API_KEY}`, requestBody);

            if (result.Errors && result.Errors.length > 0) {
                console.error('Mouser API error:', result.Errors[0].Message, 'Response:', JSON.stringify(result));
                return res.status(400).json({ error: result.Errors[0].Message });
            }

            if (!result.SearchResults || !result.SearchResults.Parts || result.SearchResults.Parts.length === 0) {
                console.log('No more parts found, ending fetch');
                hasMoreParts = false;
                break;
            }

            const parts = result.SearchResults.Parts;
            console.log(`Fetched ${parts.length} parts from Mouser API, Total Records: ${result.SearchResults.NumberOfResult || 'N/A'}`);

            for (const partData of parts) {
                const existingPart = await Part.findOne({ mouserPartNumber: partData.MouserPartNumber });
                if (!existingPart) {
                    const part = new Part({
                        mouserPartNumber: partData.MouserPartNumber,
                        description: partData.Description,
                        manufacturer: partData.Manufacturer,
                        price: partData.PriceBreaks && partData.PriceBreaks.length > 0 ? partData.PriceBreaks[0].Price : 'N/A',
                        availability: partData.Availability || 'N/A',
                    });
                    await part.save();
                    console.log(`Saved part: ${partData.MouserPartNumber}`);
                    totalPartsSaved++;
                } else {
                    console.log(`Part ${partData.MouserPartNumber} already exists, skipping`);
                }
            }

            startingRecord += recordsPerPage;
            if (result.SearchResults.NumberOfResult && startingRecord >= result.SearchResults.NumberOfResult) {
                hasMoreParts = false;
            }
        }

        console.log(`Successfully saved ${totalPartsSaved} new parts to MongoDB`);
        res.json({ message: `Saved ${totalPartsSaved} parts`, total: totalPartsSaved });
    } catch (error) {
        console.error('Error saving all parts:', error.message, error.response?.data || 'No response data');
        res.status(500).json({ error: 'Failed to save parts', details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Microservice running on http://localhost:${port}`);
});