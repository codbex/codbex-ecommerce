import { Money } from '../types/Types';

import { CampaignRepository } from "codbex-products/gen/codbex-products/dao/Campaigns/CampaignRepository";
import { CurrencyRepository } from "codbex-currencies/gen/codbex-currencies/dao/Settings/CurrencyRepository";
import { CampaignEntryRepository } from "codbex-products/gen/codbex-products/dao/Products/CampaignEntryRepository";
import { ProductImageRepository } from "codbex-products/gen/codbex-products/dao/Products/ProductImageRepository";
import { ProductAvailabilityRepository } from "codbex-inventory/gen/codbex-inventory/dao/Products/ProductAvailabilityRepository";

const CurrencyDao = new CurrencyRepository();
const ProductAvailabilityDao = new ProductAvailabilityRepository();
const ProductImageDao = new ProductImageRepository();
const CampaignEntryDao = new CampaignEntryRepository();
const CampaignDao = new CampaignRepository();

export function getProductsResponse(productIds: any[], products: any[]) {
    const imageMap = getProductsImages(productIds);
    const availabilityMap = getProductsAvailability(productIds);
    const currencyMap = mapProductIdToCurrencyCode(products);

    const filteredProducts = products.filter(p => productIds.includes(p.Id));

    const productsResponse = filteredProducts.map(p => {
        const imageData = imageMap.get(p.Id) ?? { featuredImage: null, images: [] };
        const isAvailable = availabilityMap.get(p.Id) ?? false;
        const currencyCode = currencyMap.get(p.Id) ?? 'UNKNOWN';
        const productCampaign = getCampaign(p.Id);

        return {
            id: String(p.Id),
            sku: p.SKU,
            title: p.Title,
            shortDescription: p.ShortDescription,
            price: {
                amount: productCampaign ? productCampaign.newPrice : p.Price,
                currency: currencyCode,
            } as Money,
            discountPrice: productCampaign
                ? { amount: productCampaign.newPrice, currency: currencyCode } as Money
                : null,
            oldPrice: productCampaign
                ? { amount: productCampaign.oldPrice, currency: currencyCode } as Money
                : null,
            brand: String(p.Manufacturer),
            discountPercentage: productCampaign?.discountPercentage ?? null,
            category: String(p.Category),
            availableForSale: isAvailable,
            featuredImage: imageData.featuredImage,
            images: imageData.images
        };
    });

    return productsResponse;
}

export function productsIdsInCampaign(productIds: number[]): number[] {
    if (productIds.length === 0) return [];

    const activeProducts: number[] = [];

    for (const productId of productIds) {
        const campaign = getCampaign(productId);
        if (campaign) {
            activeProducts.push(productId);
        }
    }

    return activeProducts;
}

export function getCampaign(productId: number) {

    const products = CampaignEntryDao.findAll({
        $filter: {
            equals: {
                Product: productId
            }
        }
    });

    if (products.length === 0) {
        return null;
    }

    const campaignId = products[0].Campaign;
    if (!campaignId) {
        return null;
    }

    const campaigns = CampaignDao.findById(campaignId);

    if (!campaigns) {
        return null;
    }

    const startDate = new Date(campaigns.StartDate);
    const endDate = new Date(campaigns.EndDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isTodayInRange = today >= startDate && today <= endDate;

    return isTodayInRange
        ? {
            oldPrice: products[0].OldPrice,
            newPrice: products[0].NewPrice,
            discountPercentage: products[0].Percent
        }
        : null;
}

export function getProductsImages(productIds: number[]) {
    if (productIds.length === 0) return new Map();

    const productImages = ProductImageDao.findAll();

    const imageMap = new Map();

    for (const img of productImages) {

        if (!imageMap.has(img.Product)) {
            imageMap.set(img.Product, { featuredImage: null, images: [] });
        }

        const entry = imageMap.get(img.Product)!;
        entry.images.push(img.ImageLink);

        if (img.IsFeature && !entry.featuredImage) {
            entry.featuredImage = img.ImageLink;
        }
    }

    return imageMap;
}

export function getProductsAvailability(productIds: string[]): Map<string, boolean> {
    const map = new Map<string, boolean>();

    for (const id of productIds) {
        const rows = ProductAvailabilityDao.findAll({
            $filter: {
                equals: { Product: parseInt(id, 10) }
            }
        });

        const available = rows.some(row => row.Quantity > 0);
        map.set(id, available);
    }

    return map;
}

export function mapProductIdToCurrencyCode(products: any): Map<number, string> {

    const currencyIds = products.map(p => p.Currency);
    const currencies = currencyIds.map(id => CurrencyDao.findById(id))

    const currencyMap = new Map(currencies.map(c => [c.Id, c.Code]));

    return new Map(
        products.map(p => [p.Id, currencyMap.get(p.Currency)])
    );
}