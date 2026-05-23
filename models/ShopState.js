const mongoose = require('mongoose');

const shopStateSchema = new mongoose.Schema({
    singletonId: { type: String, default: 'main_shop_state', unique: true },
    products: { type: mongoose.Schema.Types.Mixed, default: [] },
    transactions: { type: mongoose.Schema.Types.Mixed, default: [] },
    wholesaleTransactions: { type: mongoose.Schema.Types.Mixed, default: [] },
    customers: { type: mongoose.Schema.Types.Mixed, default: [] },
    notifications: { type: mongoose.Schema.Types.Mixed, default: [] },
    cheques: { type: mongoose.Schema.Types.Mixed, default: [] },
    purchaseInvoices: { type: mongoose.Schema.Types.Mixed, default: [] },
    expenses: { type: mongoose.Schema.Types.Mixed, default: [] },
    employees: { type: mongoose.Schema.Types.Mixed, default: [] },
    categories: { type: mongoose.Schema.Types.Mixed, default: [] },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { minimize: false, timestamps: true });

module.exports = mongoose.model('ShopState', shopStateSchema);
