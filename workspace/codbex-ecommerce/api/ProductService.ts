import { Controller, Get } from "sdk/http";
import { query, sql } from 'sdk/db';

@Controller
class ProductService {

    @Get("/categories")
    public categoriesData() {
        const categoryQuery = sql.getDialect()
            .select()
            .column('PRODUCTCATEGORY_ID')
            .column('PRODUCTCATEGORY_NAME')
            .column('COUNT(PRODUCT_ID) PRCOUNT')
            .from('CODBEX_PRODUCTCATEGORY')
            .leftJoin('CODBEX_PRODUCT', 'PRODUCT_CATEGORY = PRODUCTCATEGORY_ID')
            .group('PRODUCTCATEGORY_ID')
            .group('PRODUCTCATEGORY_NAME')
            .build();

        const categoryResult = query.execute(categoryQuery, []);

        const categories = categoryResult.map(row => ({
            id: row.PRODUCTCATEGORY_ID,
            title: row.PRODUCTCATEGORY_NAME,
            productCount: row.PRCOUNT
        }));

        return categories;
    }

    @Get("/brands")
    public brandsData() {
        const sqlQuery = sql.getDialect()
            .select()
            .column('MANUFACTURER_ID')
            .column('MANUFACTURER_NAME')
            .from('CODBEX_MANUFACTURER')
            .build();

        const brandsResult = query.execute(sqlQuery, []);

        const allBrands = brandsResult.map(row => ({
            id: row.MANUFACTURER_ID,
            name: row.MANUFACTURER_NAME
        }));

        return allBrands;
    }

    @Get("/products")
    public allProducts() {

        const productSQL = `
        SELECT 
            PRODUCT_ID AS ID,
            PRODUCT_TITLE AS TITLE,
            PRODUCT_PRICE AS PRICE,
            PRODUCT_CATEGORY AS CATEGORY
        FROM 
            CODBEX_PRODUCT
        LIMIT 30;
`;
        const products = query.execute(productSQL);

        const productIds = products.map(p => p.ID);

        let images = [];
        if (productIds.length > 0) {
            const ids = productIds.map(() => '?').join(', ');

            const imagesSQL = `
    SELECT 
        PRODUCTIMAGE_PRODUCT AS PRODUCTID,
        PRODUCTIMAGE_IMAGELINK AS IMAGELINK,
        PRODUCTIMAGE_ISFEATURE AS ISFEATURE
    FROM 
        CODBEX_PRODUCTIMAGE
    WHERE 
        PRODUCTIMAGE_PRODUCT IN (${ids});
    `;
            images = query.execute(imagesSQL, productIds);
        }

        const imageMap = new Map();
        for (const img of images) {
            const key = img.PRODUCTID;

            if (!imageMap.has(key)) {
                imageMap.set(key, { featuredImage: null, images: [] });
            }
            const entry = imageMap.get(key);
            entry.images.push(img.IMAGELINK);

            if (img.ISFEATURE === true && !entry.featuredImage) {
                entry.featuredImage = img.IMAGELINK;
            }
        }

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.ID) ?? { featuredImage: null, images: [] };
            return {
                id: p.ID,
                title: p.TITLE,
                price: p.PRICE,
                category: p.CATEGORY,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }
    @Get("/product/:productId")
    public productData(_: any, ctx: any) {
        const productId = ctx.pathParameters.productId;

        const productQuery = sql.getDialect()
            .select()
            .column('PRODUCT_ID')
            .column('PRODUCT_TITLE')
            .column('PRODUCT_CATEGORY')
            .column('PRODUCT_MANUFACTURER')
            .column('PRODUCT_DESCRIPTION')
            .column('PRODUCT_PRICE')
            .from('CODBEX_PRODUCT')
            .where('PRODUCT_ID = ?')
            .build();

        const imagesQuery = sql.getDialect()
            .select()
            .column('PRODUCTIMAGE_IMAGELINK')
            .column('PRODUCTIMAGE_ISFEATURE')
            .from('CODBEX_PRODUCTIMAGE')
            .where('PRODUCTIMAGE_PRODUCT = ?')
            .build();

        const productsResult = query.execute(productQuery, [productId]).at(0);
        const imagesResult = query.execute(imagesQuery, [productId]);

        const featuredImage = imagesResult.find(img => img.PRODUCTIMAGE_ISFEATURE === true);

        return {
            id: productsResult.PRODUCT_ID,
            title: productsResult.PRODUCT_TITLE,
            category: productsResult.PRODUCT_CATEGORY,
            brand: productsResult.PRODUCT_MANUFACTURER,
            description: productsResult.PRODUCT_DESCRIPTION,
            price: productsResult.PRODUCT_PRICE,
            featuredImage: featuredImage ? featuredImage.PRODUCTIMAGE_IMAGELINK : null,
            images: imagesResult.map(img => img.PRODUCTIMAGE_IMAGELINK)
        };
    }

    @Get("/productsByCategory/:categoryId")
    public productByCategory(_: any, ctx: any) {
        const categoryId = ctx.pathParameters.categoryId;

        const productQuery = sql.getDialect()
            .select()
            .column('PRODUCT_ID')
            .column('PRODUCT_TITLE')
            .column('PRODUCT_PRICE')
            .column('PRODUCT_CATEGORY')
            .from('CODBEX_PRODUCT')
            .where('PRODUCT_CATEGORY = ?')
            .build();

        const products = query.execute(productQuery, [categoryId]);

        const productIds = products.map(p => p.PRODUCT_ID);

        let images = [];
        if (productIds.length > 0) {
            const ids = productIds.map(() => '?').join(',');

            const imagesQuery = sql.getDialect()
                .select()
                .column('PRODUCTIMAGE_PRODUCT')
                .column('PRODUCTIMAGE_IMAGELINK')
                .column('PRODUCTIMAGE_ISFEATURE')
                .from('CODBEX_PRODUCTIMAGE')
                .where(`PRODUCTIMAGE_PRODUCT IN (${ids})`)
                .build();

            images = query.execute(imagesQuery, productIds);
        }

        const imageMap = new Map();
        for (const img of images) {
            const key = img.PRODUCTIMAGE_PRODUCT;

            if (!imageMap.has(key)) {
                imageMap.set(key, { featuredImage: null, images: [] });
            }
            const entry = imageMap.get(key);
            entry.images.push(img.PRODUCTIMAGE_IMAGELINK);

            if (img.PRODUCTIMAGE_ISFEATURE === true && !entry.featuredImage) {
                entry.featuredImage = img.PRODUCTIMAGE_IMAGELINK;
            }
        }

        const productsResponse = products.map(p => {
            const imageData = imageMap.get(p.PRODUCT_ID) ?? { featuredImage: null, images: [] };
            return {
                id: p.PRODUCT_ID,
                title: p.PRODUCT_TITLE,
                price: p.PRODUCT_PRICE,
                category: p.PRODUCT_CATEGORY,
                featuredImage: imageData.featuredImage,
                images: imageData.images
            };
        });

        return productsResponse;
    }
}
