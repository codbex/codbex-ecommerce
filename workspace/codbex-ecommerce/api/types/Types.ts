export interface Money {
    amount: number;
    currency: string;
};

export interface SalesOrder {
    id: string;
    creationDate: string;
    status: string;
    totalAmount: Money;
};

export interface AccountDetails {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    creationDate: string;
}

export interface Address {
    id: number;
    firstName: string;
    lastName: string;
    country: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    phoneNumber: string;
    email: string;
}

export interface UpdateAddress {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    country: string;
    city: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
}

export interface AddAddress {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    country: string;
    city: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
    addressType: string;
}

export interface AddressesResponse {
    shippingAddress: Address[];
    billingAddress: Address[];
}

export interface UpdateAccount {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
}

export interface Customer {
    Id: number | string;
    FirstName: string;
    LastName: string;
    Name: string;
    Phone: string;
    Email: string;
    CreationDate?: string;
}
