const Category = require('../models/category');

module.exports.createCategoryOther = async() => {
    let category = await Category.findOne({name: 'Прочие'})
    if(!category) {
        category = new Category({
            name: 'Прочие',
            suppliers: []
        });
        await Category.create(category)
    }
    category = await Category.findOne({name: 'Автозакуп'})
    if(!category) {
        category = new Category({
            name: 'Автозакуп',
            suppliers: []
        });
        await Category.create(category)
    }
}