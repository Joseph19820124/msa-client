const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Category = require('../../../models/Category');
const categoriesController = require('../../../controllers/categoriesController');

// Create test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/categories', categoriesController.getAllCategories);
app.get('/categories/active', categoriesController.getActiveCategories);
app.get('/categories/:id', categoriesController.getCategoryById);
app.post('/categories', categoriesController.createCategory);
app.put('/categories/:id', categoriesController.updateCategory);
app.delete('/categories/:id', categoriesController.deleteCategory);
app.get('/categories/slug/:slug', categoriesController.getCategoryBySlug);

describe('Categories Controller Unit Tests', () => {
  let testCategory;

  beforeEach(async () => {
    testCategory = new Category(testUtils.generateTestCategory());
    await testCategory.save();
  });

  describe('GET /categories - getAllCategories', () => {
    it('should return all categories with pagination', async () => {
      const response = await request(app)
        .get('/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalCount).toBe(1);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/categories?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.pageSize).toBe(5);
    });

    it('should sort categories', async () => {
      // Create another category
      const secondCategory = new Category({
        ...testUtils.generateTestCategory({
          name: 'Another Category',
          createdAt: new Date(Date.now() + 1000)
        })
      });
      await secondCategory.save();

      const response = await request(app)
        .get('/categories?sort=name&order=asc')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Another Category');
    });

    it('should search categories by name', async () => {
      const response = await request(app)
        .get('/categories?search=Test')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      jest.spyOn(Category, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /categories/active - getActiveCategories', () => {
    beforeEach(async () => {
      // Create inactive category
      const inactiveCategory = new Category({
        ...testUtils.generateTestCategory({
          name: 'Inactive Category',
          slug: 'inactive-category',
          isActive: false
        })
      });
      await inactiveCategory.save();
    });

    it('should return only active categories', async () => {
      const response = await request(app)
        .get('/categories/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isActive).toBe(true);
    });

    it('should handle empty result', async () => {
      // Deactivate all categories
      await Category.updateMany({}, { isActive: false });

      const response = await request(app)
        .get('/categories/active')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /categories/:id - getCategoryById', () => {
    it('should return a specific category', async () => {
      const response = await request(app)
        .get(`/categories/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCategory._id.toString());
      expect(response.body.data.name).toBe(testCategory.name);
    });

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/categories/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });
  });

  describe('POST /categories - createCategory', () => {
    const validCategoryData = {
      name: 'New Test Category',
      description: 'New test category description',
      color: '#28a745'
    };

    it('should create a new category', async () => {
      const response = await request(app)
        .post('/categories')
        .send(validCategoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validCategoryData.name);
      expect(response.body.data.slug).toBe('new-test-category');
      expect(response.body.data.isActive).toBe(true);
    });

    it('should auto-generate slug from name', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          ...validCategoryData,
          name: 'Category With Special Characters!@#'
        })
        .expect(201);

      expect(response.body.data.slug).toBe('category-with-special-characters');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          description: 'Description without name'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });

    it('should validate name length', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          ...validCategoryData,
          name: 'A' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate color format', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          ...validCategoryData,
          color: 'invalid-color'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should ensure slug uniqueness', async () => {
      // Create first category
      await request(app)
        .post('/categories')
        .send(validCategoryData)
        .expect(201);

      // Try to create category with same name
      const response = await request(app)
        .post('/categories')
        .send(validCategoryData)
        .expect(201);

      expect(response.body.data.slug).toBe('new-test-category-1');
    });

    it('should prevent duplicate names', async () => {
      // Create first category
      await request(app)
        .post('/categories')
        .send(validCategoryData)
        .expect(201);

      // Try to create category with exact same name
      const response = await request(app)
        .post('/categories')
        .send(validCategoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('PUT /categories/:id - updateCategory', () => {
    it('should update an existing category', async () => {
      const updateData = {
        name: 'Updated Test Category',
        description: 'Updated description',
        color: '#dc3545'
      };

      const response = await request(app)
        .put(`/categories/${testCategory._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.color).toBe(updateData.color);
    });

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/categories/${nonExistentId}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/categories/${testCategory._id}`)
        .send({ name: 'A' }) // Too short
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update slug when name changes', async () => {
      const response = await request(app)
        .put(`/categories/${testCategory._id}`)
        .send({ name: 'Completely New Category Name' })
        .expect(200);

      expect(response.body.data.slug).toBe('completely-new-category-name');
    });

    it('should toggle active status', async () => {
      const response = await request(app)
        .put(`/categories/${testCategory._id}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /categories/:id - deleteCategory', () => {
    it('should delete an existing category', async () => {
      const response = await request(app)
        .delete(`/categories/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify category is deleted
      const deletedCategory = await Category.findById(testCategory._id);
      expect(deletedCategory).toBeNull();
    });

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/categories/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle categories with associated posts', async () => {
      // This test would require Post model integration
      // For now, we'll test the basic deletion
      const response = await request(app)
        .delete(`/categories/${testCategory._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /categories/slug/:slug - getCategoryBySlug', () => {
    it('should return category by slug', async () => {
      const response = await request(app)
        .get(`/categories/slug/${testCategory.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe(testCategory.slug);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/categories/slug/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const response = await request(app)
        .get('/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          name: '', // Empty name
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/categories')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});