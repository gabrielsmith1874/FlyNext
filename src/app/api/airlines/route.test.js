const request = require('supertest');
const app = require('../../../../app'); // Adjust the path as necessary

describe('Airline Routes', () => {
	test('GET /airlines should return a list of airlines', async () => {
		const response = await request(app).get('/airlines');
		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
	});

	test('GET /airlines/:id should return a specific airline', async () => {
		const response = await request(app).get('/airlines/1');
		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', 1);
	});

	test('GET /airlines/:id should return 404 for non-existent airline', async () => {
		const response = await request(app).get('/airlines/999');
		expect(response.statusCode).toBe(404);
	});
});