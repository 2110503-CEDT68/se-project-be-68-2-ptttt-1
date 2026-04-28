const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campground Booking API',
      version: '1.0.0',
      description:
        'REST API for the Campground Booking System — manages campgrounds, bookings, reviews, and user authentication.',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the JWT token returned from /api/v1/auth/login',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'HTTP-only cookie set automatically on login',
        },
      },
      schemas: {
        Campground: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6634a1b2c3d4e5f6a7b8c9d0' },
            name: { type: 'string', example: 'Pine Valley Campground' },
            address: { type: 'string', example: '123 Forest Road, Chiang Mai' },
            tel: { type: 'string', example: '053-123-456' },
            picture: { type: 'string', format: 'uri', example: 'https://example.com/image.jpg' },
            sumRating: { type: 'number', example: 42 },
            countReview: { type: 'number', example: 10 },
            ratingCount: {
              type: 'array',
              items: { type: 'integer' },
              example: [0, 1, 2, 3, 4],
            },
          },
        },
        CampgroundInput: {
          type: 'object',
          required: ['name', 'address', 'tel', 'picture'],
          properties: {
            name: { type: 'string', example: 'Pine Valley Campground' },
            address: { type: 'string', example: '123 Forest Road, Chiang Mai' },
            tel: { type: 'string', example: '053-123-456' },
            picture: { type: 'string', format: 'uri', example: 'https://example.com/image.jpg' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6634b1b2c3d4e5f6a7b8c9d1' },
            bookingDate: { type: 'string', format: 'date', example: '2025-06-15' },
            nights: { type: 'integer', minimum: 1, maximum: 3, example: 2 },
            user: { type: 'string', example: '6634c1b2c3d4e5f6a7b8c9d2' },
            campground: { type: 'string', example: '6634a1b2c3d4e5f6a7b8c9d0' },
          },
        },
        BookingInput: {
          type: 'object',
          required: ['bookingDate', 'nights'],
          properties: {
            bookingDate: { type: 'string', format: 'date', example: '2025-06-15' },
            nights: { type: 'integer', minimum: 1, maximum: 3, example: 2 },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6634d1b2c3d4e5f6a7b8c9d3' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
            comment: { type: 'string', example: 'Great place to camp!' },
            user: { type: 'string', example: '6634c1b2c3d4e5f6a7b8c9d2' },
            campground: { type: 'string', example: '6634a1b2c3d4e5f6a7b8c9d0' },
            booking: { type: 'string', example: '6634b1b2c3d4e5f6a7b8c9d1' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ReviewInput: {
          type: 'object',
          required: ['rating', 'comment', 'booking'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
            comment: { type: 'string', example: 'Great place to camp!' },
            booking: { type: 'string', example: '6634b1b2c3d4e5f6a7b8c9d1' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6634c1b2c3d4e5f6a7b8c9d2' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            tel: { type: 'string', example: '081-234-5678' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Not authorized to access this route' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'User registration, login, profile management' },
      { name: 'Campgrounds', description: 'Campground CRUD operations' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Reviews', description: 'Campground reviews' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
