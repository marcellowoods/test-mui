// import {
// 	ReasonPhrases,
// 	StatusCodes,
// 	getReasonPhrase,
// 	getStatusCode,
// } from 'http-status-codes';

const { StatusCodes, ReasonPhrases } = require('http-status-codes');


const Product = require('../models/product');

const filterProductsByPrice = (products, minMaxValues) => {

    const min = minMaxValues[0];
    const max = minMaxValues[1];


    return products.filter((product) => {

        return product.price >= min && product.price <= max;

    })



}

const filterProductsByCategory = (products, value) => products.filter((p) => p.category == value);

const filterProductsByBrand = (products, brands) => products.filter((p) => p.brand && brands.includes(p.brand));

const filterProducts = (products, field, value) => {

    // console.log(typeof value);

    return products.filter((product) => {

        let prop = product[field];

        //some products don't have brand
        if (!prop) {
            prop = "";
        }

        return prop.toString().toLowerCase().includes(value.toLowerCase());

    })



}

const getMinMaxPrice = (products) => {

    // console.log(typeof value);

    if (!products.length) {

        console.log("no products")
        return { min: 0, max: 0, stepSize: 0 };
    }

    const allPrices = products.map((p) => p.price);
    let max = Math.max(...allPrices);
    let min = Math.min(...allPrices);

    const stepSize = (max - min) / 30;


    return { min, max, stepSize };
}

const getCategoriesList = (products) => {

    let categoriesList = Array.from(new Set(products.map(p => p.category)));

    return categoriesList;
}

const getBrandsList = (products) => {

    let brandsList = Array.from(new Set(products.map(p => p.brand)));

    return brandsList;
}


const createSortComparator = (sortField, desc) => {


    if (!desc) {

        return (a, b) => {

            return a[sortField] - b[sortField];

        }

    } else {

        return (a, b) => {

            return b[sortField] - a[sortField]

        }

    }

}

const getFilteredDataForField = (data, field, value) => {

    switch (field) {
        case 'price':

            return filterProductsByPrice(data, value);

        case 'category':

            return filterProductsByCategory(data, value);

        case 'brand':

            return filterProductsByBrand(data, value);

        default:

            return filterProducts(data, field, value);

    }
}

const getFilteredDataForGlobalFilter = (data, globalFilterString) => {

    return data.filter(p => {

        for (let field in p) {

            let prop = p[field];
            if (!prop) {
                return false;
            }

            if (prop.toString().toLowerCase().includes(globalFilterString.toLowerCase())) {
                return true;
            }

        }

        return false;
    })
}

//apply all filters
const getFilteredDataForEveryField = (data, filters) => {

    let filteredData = data;

    filters.forEach((filter) => {

        const { id: field, value } = filter;
        filteredData = getFilteredDataForField(filteredData, field, value);

    })

    return filteredData;
}

const getFilteredDataForEveryFieldExceptOne = (data, filters, dontFilterField) => {

    let filteredData = data;

    filters.forEach((filter) => {

        const { id: field, value } = filter;
        if (field == dontFilterField) {
            return;
        }
        filteredData = getFilteredDataForField(filteredData, field, value);
    })

    return filteredData;


}


exports.getProducts = async (req, res, next) => {

    console.log(req.query);
    const start = Number.parseInt(req.query["start"]);
    const size = Number.parseInt(req.query["size"]);
    const filters = JSON.parse(req.query["filters"]);
    const globalFilter = req.query["globalFilter"];
    const sorting = JSON.parse(req.query["sorting"]);

    // console.log("start:");
    // console.log(start);
    // console.log("size:");
    // console.log(size);
    // console.log("filters:");
    // console.log(filters);
    // console.log("globalFilter:");
    // console.log(globalFilter);
    // console.log("sorting:");
    // console.log(sorting);

    // console.log(data);
    // TODO:
    // Add sorting
    // Add pagination
    // Add filtering

    let unfilteredData = await Product.findAll();

    let filteredDataWithGlobalFilter = getFilteredDataForGlobalFilter(unfilteredData, globalFilter);

    let filteredDataForAllFields = getFilteredDataForEveryField(unfilteredData, filters);
    
    filteredDataForAllFields = getFilteredDataForGlobalFilter(filteredDataForAllFields, globalFilter);

    let meta = {};


    const priceFilter = filters.find((filter) => filter.id == "price");

    if (priceFilter) {

        let filteredData = getFilteredDataForEveryFieldExceptOne(filteredDataWithGlobalFilter, filters, "price");
        const minMaxPrice = getMinMaxPrice(filteredData);
        meta.minMaxPrice = minMaxPrice;

    }else{

        const minMaxPrice = getMinMaxPrice(filteredDataForAllFields);
        meta.minMaxPrice = minMaxPrice;
    }

    const categoryFilter = filters.find((filter) => filter.id == "category");

    if (categoryFilter) {

        let filteredData = getFilteredDataForEveryFieldExceptOne(filteredDataWithGlobalFilter, filters, "category");
        const categoriesList = getCategoriesList(filteredData);
        meta.categoriesList = categoriesList;

    }else{
        const categoriesList = getCategoriesList(filteredDataForAllFields);
        meta.categoriesList = categoriesList;

    }

    const brandsFilter = filters.find((filter) => filter.id == "brand");

    if (brandsFilter) {

        let filteredData = getFilteredDataForEveryFieldExceptOne(filteredDataWithGlobalFilter, filters, "brand");
        const brandsList = getBrandsList(filteredData);
        meta.brandsList = brandsList;

    }else{

        const brandsList = getBrandsList(filteredDataForAllFields);
        meta.brandsList = brandsList;
    }

    

    let data = filteredDataForAllFields;
    const totalRowCount = data.length;
    meta.totalRowCount = totalRowCount;

    if (sorting[0]) {

        const { id: sortField, desc } = sorting[0];
        const sortComparator = createSortComparator(sortField, desc);
        data = data.sort(sortComparator);

    }

    data = data.slice(start, start + size);

    const response = {
        data,
        meta
    }

    return res.status(StatusCodes.OK).json(response);
}