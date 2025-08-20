import { query, sql } from 'sdk/db';
import { Money } from '../types/Types';

export function getProductsResponse(productIds: any[], products: any[]) {
    const imageMap = getProductsImages(productIds);
    const availabilityMap = getProductsAvailability(productIds);
    const currencyMap = mapProductIdToCurrencyCode(products);

    const productsResponse = products.map(p => {
        const imageData = imageMap.get(p.PRODUCT_ID) ?? { featuredImage: null, images: [] };
        const isAvailable = availabilityMap.get(p.PRODUCT_ID) ?? false;
        const currencyCode = currencyMap.get(p.PRODUCT_ID) ?? 'UNKNOWN';
        const productCampaign = getCampaign(p.PRODUCT_ID);

        return {
            id: String(p.PRODUCT_ID),
            sku: p.PRODUCT_SKU,
            title: p.PRODUCT_TITLE,
            shortDescription: p.PRODUCT_SHORTDESCRIPTION,
            price: {
                amount: productCampaign ? productCampaign.newPrice : p.PRODUCT_PRICE,
                currency: currencyCode,
            } as Money,
            discountPrice: productCampaign
                ? { amount: productCampaign.newPrice, currency: currencyCode } as Money
                : null,
            oldPrice: productCampaign
                ? { amount: productCampaign.oldPrice, currency: currencyCode } as Money
                : null,
            brand: p.PRODUCT_MANUFACTURER,
            discountPercentage: productCampaign?.discountPercentage ?? null,
            category: p.PRODUCT_CATEGORY,
            availableForSale: isAvailable,
            featuredImage: imageData.featuredImage,
            images: imageData.images
        };
    });

    return productsResponse;
}

export function getCampaign(productId: number) {

    const productQuery = sql.getDialect()
        .select()
        .column('CAMPAIGNENTRY_OLDPRICE')
        .column('CAMPAIGNENTRY_CAMPAIGN')
        .column('CAMPAIGNENTRY_NEWPRICE')
        .column('CAMPAIGNENTRY_PERCENT')
        .from('CODBEX_CAMPAIGNENTRY')
        .where('CAMPAIGNENTRY_PRODUCT = ?')
        .build();

    const products = query.execute(productQuery, [productId]);

    if (!products || products.length === 0) {
        return null;
    }

    const campaignId = products[0].CAMPAIGNENTRY_CAMPAIGN;
    if (!campaignId) {
        return null;
    }

    const campaignQuery = sql.getDialect()
        .select()
        .column('CAMPAIGN_STARTDATE')
        .column('CAMPAIGN_ENDDATE')
        .from('CODBEX_CAMPAIGN')
        .where('CAMPAIGN_ID = ?')
        .build();

    const campaigns = query.execute(campaignQuery, [campaignId]);

    if (!campaigns || campaigns.length === 0) {
        return null;
    }

    const startDate = new Date(campaigns[0].CAMPAIGN_STARTDATE);
    const endDate = new Date(campaigns[0].CAMPAIGN_ENDDATE);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isTodayInRange = today >= startDate && today <= endDate;

    return isTodayInRange
        ? {
            oldPrice: products[0].CAMPAIGNENTRY_OLDPRICE,
            newPrice: products[0].CAMPAIGNENTRY_NEWPRICE,
            discountPercentage: products[0].CAMPAIGNENTRY_PERCENT
        }
        : null;
}

export function getProductsImages(productIds: number[]) {
    if (productIds.length === 0) {
        return new Map();
    }

    const placeholders = productIds.map(() => '?').join(',');

    const imagesQuery = sql.getDialect()
        .select()
        .column('PRODUCTIMAGE_PRODUCT')
        .column('PRODUCTIMAGE_IMAGELINK')
        .column('PRODUCTIMAGE_ISFEATURE')
        .from('CODBEX_PRODUCTIMAGE')
        .where(`PRODUCTIMAGE_PRODUCT IN (${placeholders})`)
        .build();

    const images = query.execute(imagesQuery, productIds);

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

    return imageMap;
}

export function getProductsAvailability(productIds: string[]): Map<string, boolean> {
    const availabilityRows = query.execute(
        sql.getDialect()
            .select()
            .column('PRODUCTAVAILABILITY_PRODUCT')
            .column('PRODUCTAVAILABILITY_QUANTITY')
            .from('CODBEX_PRODUCTAVAILABILITY')
            .where(`PRODUCTAVAILABILITY_PRODUCT IN (${productIds})`)
            .build()
    );

    const map = new Map<string, boolean>();
    for (const row of availabilityRows) {
        map.set(row.PRODUCTAVAILABILITY_PRODUCT, row.PRODUCTAVAILABILITY_QUANTITY > 0);
    }

    return map;
}

export function mapProductIdToCurrencyCode(products: any): Map<number, string> {

    const currencyIds = products.map(p => p.PRODUCT_CURRENCY);

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_ID')
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where(`CURRENCY_ID IN (${currencyIds.map(() => '?').join(',')})`)
        .build();

    const currencies = query.execute(currencyQuery, currencyIds);

    const currencyMap = new Map(currencies.map(c => [c.CURRENCY_ID, c.CURRENCY_CODE]));

    return new Map(
        products.map(p => [p.PRODUCT_ID, currencyMap.get(p.PRODUCT_CURRENCY)])
    );
}

export function getCurrencyCode(currencyId: number) {

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where('CURRENCY_ID = ?')
        .build();

    const result = query.execute(currencyQuery, [currencyId]);
    return result.length > 0 ? result[0].CURRENCY_CODE : null;
}