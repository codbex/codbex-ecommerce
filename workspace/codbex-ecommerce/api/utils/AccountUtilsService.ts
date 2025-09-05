import * as utils from './UtilsService';
import { Address, Money } from '../types/Types'

import { SalesOrderItemRepository } from "codbex-orders/gen/codbex-orders/dao/SalesOrder/SalesOrderItemRepository";
import { SalesOrderRepository } from "codbex-orders/gen/codbex-orders/dao/SalesOrder/SalesOrderRepository";
import { ProductRepository } from "codbex-products/gen/codbex-products/dao/Products/ProductRepository";
import { CurrencyRepository } from "codbex-currencies/gen/codbex-currencies/dao/Settings/CurrencyRepository";
import { ProductImageRepository } from "codbex-products/gen/codbex-products/dao/Products/ProductImageRepository";

export function mapAddresses(allAddresses: any[]): { shippingAddress: Address[]; billingAddress: Address[]; } {

    const mappedAddresses = allAddresses.map(row => {

          if (!row) return {};

        const countryCode = utils.getCountryCode(row.Country);
        const countryName = utils.getCountryName(row.Country);
        const city = utils.getCityName(row.City);

        return {
            id: String(row.Id),
            firstName: row.FirstName,
            lastName: row.LastName,
            country: countryCode,
            countryName: countryName,
            addressLine1: row.AddressLine1,
            addressLine2: row.AddressLine2,
            city: city,
            postalCode: row.PostalCode,
            phoneNumber: row.Phone,
            email: row.Email,
            addressType: String(row.AddressType)
        };
    });

    const shippingAddress: Address[] = mappedAddresses
        .filter(a => a.addressType === "1")
        .map(({ addressType, ...rest }) => rest);

    const billingAddress: Address[] = mappedAddresses
        .filter(a => a.addressType === "2")
        .map(({ addressType, ...rest }) => rest);

    return {
        shippingAddress,
        billingAddress
    };
}

export function getSalesOrderItems(salesorderId: number) {

    const SalesOrderItemDao = new SalesOrderItemRepository();
    const SalesOrderDao = new SalesOrderRepository();
    const ProductDao = new ProductRepository();
    const CurrencyDao = new CurrencyRepository();
    const ProductImageDao = new ProductImageRepository();

    const salesOrderItemsResult = SalesOrderItemDao.findAll({
        $filter: {
            equals: {
                SalesOrder: salesorderId
            }
        }
    });

    const salesOrder = SalesOrderDao.findById(salesorderId);

    return salesOrderItemsResult.map(item => {

        const product = ProductDao.findById(item.Product);
        const currency = CurrencyDao.findById(salesOrder.Currency);
        const image = ProductImageDao.findAll({
            $filter: {
                equals: {
                    Product: product.Id,
                    IsFeature: true
                }
            }
        });

        return {
            productId: product.Id,
            quantity: item.Quantity,
            title: product.Title,
            image: image[0].ImageLink,
            price: {
                amount: product.Price,
                currency: currency.Code,
            } as Money,
        }
    });
}
