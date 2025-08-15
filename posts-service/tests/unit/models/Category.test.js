const mongoose = require('mongoose');
const Category = require('../../../models/Category');

describe('Category Model Unit Tests', () => {
  
  describe('Schema Validation', () => {
    it('should create a valid category with required fields', async () => {
      const categoryData = testUtils.generateTestCategory();

      const category = new Category(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory._id).toBeDefined();
      expect(savedCategory.name).toBe(categoryData.name);
      expect(savedCategory.slug).toBe(categoryData.slug);
      expect(savedCategory.description).toBe(categoryData.description);
      expect(savedCategory.color).toBe(categoryData.color);
      expect(savedCategory.createdAt).toBeDefined();
      expect(savedCategory.updatedAt).toBeDefined();
    });

    it('should require name field', async () => {
      const categoryData = testUtils.generateTestCategory();
      delete categoryData.name;

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/name.*required/i);
    });

    it('should require slug field', async () => {
      const categoryData = testUtils.generateTestCategory();
      delete categoryData.slug;

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/slug.*required/i);
    });

    it('should validate name length constraints', async () => {
      const categoryData = testUtils.generateTestCategory({
        name: 'A' // Too short (minimum 2 characters)
      });

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/name.*shorter/i);
    });

    it('should validate name maximum length', async () => {
      const categoryData = testUtils.generateTestCategory({
        name: 'A'.repeat(101) // Too long (maximum 100 characters)
      });

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/name.*longer/i);
    });

    it('should validate slug length constraints', async () => {
      const categoryData = testUtils.generateTestCategory({
        slug: 'a' // Too short (minimum 2 characters)
      });

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/slug.*shorter/i);
    });

    it('should validate slug format', async () => {
      const invalidSlugs = [
        'Invalid Slug', // Contains spaces
        'invalid-slug-', // Ends with hyphen
        '-invalid-slug', // Starts with hyphen
        'invalid--slug', // Double hyphen
        'invalid_slug', // Contains underscore
        'Invalid@Slug' // Contains special character
      ];

      for (const slug of invalidSlugs) {
        const categoryData = testUtils.generateTestCategory({ slug });
        const category = new Category(categoryData);

        await expect(category.save()).rejects.toThrow(/slug.*format/i);
      }
    });

    it('should accept valid slug formats', async () => {
      const validSlugs = [
        'valid-slug',
        'another-valid-slug',
        'technology',
        'web-development',
        'nodejs-tutorials'
      ];

      for (const slug of validSlugs) {
        const categoryData = testUtils.generateTestCategory({
          name: `Category ${slug}`,
          slug
        });
        const category = new Category(categoryData);
        const savedCategory = await category.save();

        expect(savedCategory.slug).toBe(slug);
      }
    });

    it('should validate color format (hex)', async () => {
      const invalidColors = [
        'red', // Color name
        'rgb(255,0,0)', // RGB format
        '#xyz', // Invalid hex
        'ffffff', // Missing #
        '#ff', // Too short
        '#fffffff' // Too long
      ];

      for (const color of invalidColors) {
        const categoryData = testUtils.generateTestCategory({ color });
        const category = new Category(categoryData);

        await expect(category.save()).rejects.toThrow(/color.*format/i);
      }
    });

    it('should accept valid color formats', async () => {
      const validColors = [
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ffffff',
        '#000000',
        '#123abc'
      ];

      for (const color of validColors) {
        const categoryData = testUtils.generateTestCategory({
          name: `Category ${color}`,
          slug: `category-${color.substring(1)}`,
          color
        });
        const category = new Category(categoryData);
        const savedCategory = await category.save();

        expect(savedCategory.color).toBe(color);
      }
    });

    it('should validate description maximum length', async () => {
      const categoryData = testUtils.generateTestCategory({
        description: 'A'.repeat(501) // Too long (maximum 500 characters)
      });

      const category = new Category(categoryData);

      await expect(category.save()).rejects.toThrow(/description.*longer/i);
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const categoryData = {
        name: 'Minimal Category',
        slug: 'minimal-category'
      };

      const category = new Category(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory.isActive).toBe(true); // Default isActive
      expect(savedCategory.postCount).toBe(0); // Default postCount
      expect(savedCategory.color).toBe('#007bff'); // Default color
      expect(savedCategory.description).toBe(''); // Default description
    });

    it('should auto-generate slug from name if not provided', async () => {
      const categoryData = {
        name: 'Test Category With Spaces'
        // No slug provided
      };

      const category = new Category(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory.slug).toBe('test-category-with-spaces');
    });

    it('should handle special characters in auto-generated slug', async () => {
      const categoryData = {
        name: 'Test Category With Special Characters!@#'
      };

      const category = new Category(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory.slug).toBe('test-category-with-special-characters');
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique name constraint', async () => {
      const categoryData1 = testUtils.generateTestCategory({
        name: 'Unique Name Test'
      });

      const categoryData2 = testUtils.generateTestCategory({
        name: 'Unique Name Test', // Same name
        slug: 'different-slug'
      });

      const category1 = new Category(categoryData1);
      await category1.save();

      const category2 = new Category(categoryData2);
      await expect(category2.save()).rejects.toThrow(/duplicate.*name/i);
    });

    it('should enforce unique slug constraint', async () => {
      const categoryData1 = testUtils.generateTestCategory({
        slug: 'unique-slug'
      });

      const categoryData2 = testUtils.generateTestCategory({
        name: 'Different Name',
        slug: 'unique-slug' // Same slug
      });

      const category1 = new Category(categoryData1);
      await category1.save();

      const category2 = new Category(categoryData2);
      await expect(category2.save()).rejects.toThrow(/duplicate.*slug/i);
    });
  });

  describe('Instance Methods', () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = new Category(testUtils.generateTestCategory());
      await testCategory.save();
    });

    it('should increment post count', async () => {
      const initialCount = testCategory.postCount;
      
      await testCategory.incrementPostCount();
      
      expect(testCategory.postCount).toBe(initialCount + 1);
      
      // Verify in database
      const updatedCategory = await Category.findById(testCategory._id);
      expect(updatedCategory.postCount).toBe(initialCount + 1);
    });

    it('should decrement post count', async () => {
      // Set initial count
      testCategory.postCount = 5;
      await testCategory.save();
      
      await testCategory.decrementPostCount();
      
      expect(testCategory.postCount).toBe(4);
      
      // Verify in database
      const updatedCategory = await Category.findById(testCategory._id);
      expect(updatedCategory.postCount).toBe(4);
    });

    it('should not allow post count to go below zero', async () => {
      testCategory.postCount = 0;
      await testCategory.save();
      
      await testCategory.decrementPostCount();
      
      expect(testCategory.postCount).toBe(0);
    });

    it('should toggle active status', async () => {
      const initialStatus = testCategory.isActive;
      
      await testCategory.toggleActive();
      
      expect(testCategory.isActive).toBe(!initialStatus);
      
      // Verify in database
      const updatedCategory = await Category.findById(testCategory._id);
      expect(updatedCategory.isActive).toBe(!initialStatus);
    });

    it('should format category for API response', () => {
      const formatted = testCategory.toAPIResponse();

      expect(formatted.id).toBe(testCategory._id.toString());
      expect(formatted.name).toBe(testCategory.name);
      expect(formatted.slug).toBe(testCategory.slug);
      expect(formatted.description).toBe(testCategory.description);
      expect(formatted.color).toBe(testCategory.color);
      expect(formatted.isActive).toBe(testCategory.isActive);
      expect(formatted.postCount).toBe(testCategory.postCount);
      expect(formatted.createdAt).toBeDefined();
      expect(formatted.updatedAt).toBeDefined();
      expect(formatted.__v).toBeUndefined(); // Should exclude version key
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test categories with different statuses
      const categories = [
        {
          ...testUtils.generateTestCategory({
            name: 'Active Category 1',
            slug: 'active-category-1',
            isActive: true,
            postCount: 10
          })
        },
        {
          ...testUtils.generateTestCategory({
            name: 'Active Category 2',
            slug: 'active-category-2',
            isActive: true,
            postCount: 5
          })
        },
        {
          ...testUtils.generateTestCategory({
            name: 'Inactive Category',
            slug: 'inactive-category',
            isActive: false,
            postCount: 2
          })
        }
      ];

      await Category.insertMany(categories);
    });

    it('should find active categories only', async () => {
      const activeCategories = await Category.findActive();
      
      expect(activeCategories).toHaveLength(2);
      expect(activeCategories.every(cat => cat.isActive === true)).toBe(true);
    });

    it('should find popular categories by post count', async () => {
      const popularCategories = await Category.findPopular(1);
      
      expect(popularCategories).toHaveLength(1);
      expect(popularCategories[0].name).toBe('Active Category 1');
      expect(popularCategories[0].postCount).toBe(10);
    });

    it('should search categories by name', async () => {
      const searchResults = await Category.searchByName('Active');
      
      expect(searchResults).toHaveLength(2);
      expect(searchResults.every(cat => cat.name.includes('Active'))).toBe(true);
    });

    it('should get stats summary', async () => {
      const stats = await Category.getStatsSummary();
      
      expect(stats).toBeDefined();
      expect(stats.totalCategories).toBe(3);
      expect(stats.activeCategories).toBe(2);
      expect(stats.totalPosts).toBe(17); // 10 + 5 + 2
      expect(stats.averagePostsPerCategory).toBeCloseTo(5.67, 1); // 17/3
    });

    it('should find category by slug', async () => {
      const category = await Category.findBySlug('active-category-1');
      
      expect(category).toBeDefined();
      expect(category.name).toBe('Active Category 1');
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for queries', async () => {
      const indexes = await Category.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('name_1');
      expect(indexes).toHaveProperty('slug_1');
      expect(indexes).toHaveProperty('isActive_1');
      expect(indexes).toHaveProperty('postCount_-1');
    });

    it('should perform efficient queries on indexed fields', async () => {
      // Create many categories for performance testing
      const categories = [];
      for (let i = 0; i < 100; i++) {
        categories.push({
          name: `Performance Category ${i}`,
          slug: `performance-category-${i}`,
          description: `Description for category ${i}`,
          color: '#007bff',
          isActive: i % 2 === 0, // Alternate active/inactive
          postCount: Math.floor(Math.random() * 50)
        });
      }
      await Category.insertMany(categories);

      const startTime = Date.now();
      
      // Test indexed query performance
      const activeCategories = await Category.find({ isActive: true });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(activeCategories.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });

  describe('Middleware Hooks', () => {
    it('should update timestamps on save', async () => {
      const category = new Category(testUtils.generateTestCategory());

      const savedCategory = await category.save();
      const originalUpdatedAt = savedCategory.updatedAt;

      // Wait a moment and update
      await testUtils.wait(10);
      savedCategory.name = 'Updated Category Name';
      await savedCategory.save();

      expect(savedCategory.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should auto-generate slug on save if not provided', async () => {
      const category = new Category({
        name: 'Auto Generated Slug Category'
        // No slug provided
      });

      const savedCategory = await category.save();
      expect(savedCategory.slug).toBe('auto-generated-slug-category');
    });

    it('should update slug when name changes', async () => {
      const category = new Category(testUtils.generateTestCategory());
      await category.save();

      category.name = 'Completely Different Name';
      await category.save();

      expect(category.slug).toBe('completely-different-name');
    });

    it('should maintain slug if explicitly set', async () => {
      const category = new Category(testUtils.generateTestCategory());
      await category.save();

      const originalSlug = category.slug;
      category.name = 'Different Name';
      category.slug = originalSlug; // Keep original slug
      await category.save();

      expect(category.slug).toBe(originalSlug);
    });
  });

  describe('Virtual Properties', () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = new Category(testUtils.generateTestCategory());
      await testCategory.save();
    });

    it('should provide URL virtual property', () => {
      const expectedUrl = `/categories/${testCategory.slug}`;
      expect(testCategory.url).toBe(expectedUrl);
    });

    it('should provide summary virtual property', () => {
      const summary = testCategory.summary;
      
      expect(summary).toBeDefined();
      expect(summary.id).toBe(testCategory._id.toString());
      expect(summary.name).toBe(testCategory.name);
      expect(summary.slug).toBe(testCategory.slug);
      expect(summary.color).toBe(testCategory.color);
      expect(summary.postCount).toBe(testCategory.postCount);
    });

    it('should check if category has posts', () => {
      testCategory.postCount = 0;
      expect(testCategory.hasPosts).toBe(false);

      testCategory.postCount = 5;
      expect(testCategory.hasPosts).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      jest.spyOn(Category.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const category = new Category(testUtils.generateTestCategory());

      await expect(category.save()).rejects.toThrow('Database connection error');
    });

    it('should handle validation errors gracefully', async () => {
      const category = new Category({
        name: '', // Invalid name
        slug: 'invalid-slug'
      });

      try {
        await category.save();
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.name).toBeDefined();
      }
    });
  });
});