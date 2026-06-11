/* ==========================================================================
   PREMIUM RETAIL & WHOLESALE SHOP MANAGEMENT SYSTEM - CORE LOGIC (JS)
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. Data Store & State Initialization
// --------------------------------------------------------------------------

// Override native alert to use SweetAlert2
window.alert = function(msg) {
    let iconType = "info";
    let title = "Notification";
    if (msg.includes("WARNING") || msg.includes("ERROR") || msg.includes("Failed")) {
        iconType = "error";
        title = "Error!";
    } else if (msg.includes("successfully") || msg.includes("Success")) {
        iconType = "success";
        title = "Success!";
    }
    Swal.fire({
        title: title,
        text: msg.replace(/[\?]/g, ''),
        icon: iconType,
        confirmButtonColor: 'var(--primary-color)'
    });
};

// Async Helper for Password Prompts
async function promptOwnerPassword(msg) {
    const { value: password } = await Swal.fire({
        title: 'Authentication Required',
        text: msg,
        input: 'password',
        inputPlaceholder: 'Enter password',
        icon: 'lock',
        showCancelButton: true,
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: '#ef4444'
    });
    return password;
}

// Async Helper for Confirmations
async function confirmAction(text, isDanger = false) {
    const { isConfirmed } = await Swal.fire({
        title: 'Are you sure?',
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: isDanger ? '#ef4444' : 'var(--primary-color)',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, proceed!'
    });
    return isConfirmed;
}

function getProductStock(p) {
    if (p.isBundle) {
        if (!p.bundleItems || p.bundleItems.length === 0) return 0;
        let minStock = Infinity;
        p.bundleItems.forEach(bItem => {
            const comp = state.products.find(prod => prod.id === bItem.id);
            const compStock = comp ? comp.stock : 0;
            const possibleBundles = Math.floor(compStock / bItem.qty);
            if (possibleBundles < minStock) minStock = possibleBundles;
        });
        return minStock === Infinity ? 0 : minStock;
    }
    return p.stock || 0;
}
let state = {
    isOwnerUnlocked: false,
    products: [],
    transactions: [],
    wholesaleTransactions: [], // B2B Credit/Cash Invoices ledger
    customers: [],
    notifications: [],
    cheques: [], // B2B Credit customer cheques registry
    purchaseInvoices: [], // Stock receiving purchase invoices from suppliers
    expenses: [],
    employees: [],
    settings: {
        storeName: "Thriller Motors (Pvt) Ltd",
        currency: "RS",
        taxRate: 8,
        address: "456 Galleria Parkway, Suite 100",
        phone: "+1 (555) 767-7467",
        receiptFooter: "Thank you for choosing Thriller Motors (Pvt) Ltd! Drive safely.",
        lowStockLimit: 5,
        accentColor: "emerald",
        systemPassword: "Thriller123",
        ownerPassword: "admin123"
    },
    categories: ["Engine Oil", "Gear Oil", "Grease", "Coolants", "Additives"],
    cart: [],
    wholesaleCart: [], // B2B specific shopping cart
    activeTab: "dashboard",
    currentEditProductId: null,
    inventoryPage: 1,
    inventoryPageSize: 8
};

// Preset beautiful Unsplash retail images for various items
const PRESET_IMAGES = {
    "Electronics": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60",
    "Apparel & Fashion": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&auto=format&fit=crop&q=60",
    "Home & Living": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=60",
    "Beverages & Gourmet": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=60",
    "Fitness & Sports": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=60",
    "Default": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=60"
};

// Sample Demo Data Generator (Populated with Retail and Wholesale accounts)
function generateDemoData() {
    console.log("Generating fresh high-fidelity retail & wholesale demo data...");
    
    // 1. Products (Supports Wholesale tiers, packaging size and Minimum Order Quantities)
    const demoProducts = [
        { id: "p1", name: "Aura Noise-Cancelling Headphones", sku: "ELE-HEAD-90", category: "Electronics", costPrice: 85.00, sellingPrice: 179.99, wholesalePrice: 135.00, pkgUnit: "Box of 6", moq: 6, stock: 35, supplier: "Apex Electronics Co.", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60" },
        { id: "p2", name: "Zenith Waterproof Smartwatch", sku: "ELE-SMAR-12", category: "Electronics", costPrice: 110.00, sellingPrice: 249.00, wholesalePrice: 190.00, pkgUnit: "Pack of 3", moq: 3, stock: 14, supplier: "Zenith Hardware Corp", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=60" },
        { id: "p3", name: "Heritage Denim Trucker Jacket", sku: "APP-DENM-55", category: "Apparel & Fashion", costPrice: 32.00, sellingPrice: 89.50, wholesalePrice: 62.00, pkgUnit: "Carton of 10", moq: 10, stock: 45, supplier: "Heritage Fabrics Ltd", img: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&auto=format&fit=crop&q=60" },
        { id: "p4", name: "Urban Canvas Travel Backpack", sku: "APP-PACK-01", category: "Apparel & Fashion", costPrice: 25.00, sellingPrice: 65.00, wholesalePrice: 45.00, pkgUnit: "Box of 5", moq: 5, stock: 22, supplier: "Heritage Fabrics Ltd", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=60" },
        { id: "p5", name: "Nordic Minimalist Ceramic Vase", sku: "HOM-VASE-03", category: "Home & Living", costPrice: 11.50, sellingPrice: 34.00, wholesalePrice: 22.00, pkgUnit: "Box of 8", moq: 8, stock: 24, supplier: "Nordic Craft Studio", img: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&auto=format&fit=crop&q=60" },
        { id: "p6", name: "Aroma Ultrasonic Diffuser Set", sku: "HOM-AROM-88", category: "Home & Living", costPrice: 18.00, sellingPrice: 48.00, wholesalePrice: 32.00, pkgUnit: "Box of 6", moq: 6, stock: 3, supplier: "Nordic Craft Studio", img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=60" },
        { id: "p7", name: "Organic Ceremonial Matcha Set", sku: "BEV-MATC-07", category: "Beverages & Gourmet", costPrice: 20.00, sellingPrice: 45.00, wholesalePrice: 30.00, pkgUnit: "Box of 12", moq: 12, stock: 0, supplier: "Shizuoka Tea Import", img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=60" },
        { id: "p8", name: "Premium Single-Origin Coffee Beans", sku: "BEV-COFF-42", category: "Beverages & Gourmet", costPrice: 9.00, sellingPrice: 22.00, wholesalePrice: 15.00, pkgUnit: "Box of 20", moq: 20, stock: 55, supplier: "Andes Importers", img: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&auto=format&fit=crop&q=60" },
        { id: "p9", name: "Elite Adjustable Yoga Dumbbells", sku: "FIT-DUMB-22", category: "Fitness & Sports", costPrice: 15.00, sellingPrice: 38.00, wholesalePrice: 25.00, pkgUnit: "Pack of 4", moq: 4, stock: 18, supplier: "Vanguard Athletics", img: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=400&auto=format&fit=crop&q=60" }
    ];

    // 2. Customers (Supports Retail and B2B Store Credit accounts)
    const demoCustomers = [
        { id: "c1", name: "Vance Tech Distributors", phone: "+1 (555) 345-6789", address: "742 Evergreen Terrace, Springfield", purchaseCount: 14, loyaltyPoints: 340, isWholesale: true, companyName: "Vance Tech Distributors", creditLimit: 10000, outstandingDebt: 2480.00, salesman: "Shemal" },
        { id: "c2", name: "Broadus Imports", phone: "+1 (555) 789-0123", address: "102 Ocean Boulevard, Miami", purchaseCount: 8, loyaltyPoints: 120, isWholesale: true, companyName: "Broadus Imports", creditLimit: 0, outstandingDebt: 0.00, salesman: "Shemal" },
        { id: "c3", name: "Thorne Logistics", phone: "+1 (555) 901-2345", address: "88 Skyline Drive, Denver", purchaseCount: 22, loyaltyPoints: 680, isWholesale: true, companyName: "Thorne Logistics", creditLimit: 7500, outstandingDebt: 1200.00, salesman: "Kaveen" },
        { id: "c4", name: "Lane Boutiques LLC", phone: "+1 (555) 234-5678", address: "55 Wall Street, New York", purchaseCount: 3, loyaltyPoints: 30, isWholesale: true, companyName: "Lane Boutiques LLC", creditLimit: 5000, outstandingDebt: 0.00, salesman: "Kaveen" }
    ];

    const baseTime = Date.now();
    const demoTransactions = [];
    const demoWholesaleTransactions = [];

    const getPastDate = (daysAgo, hour) => {
        const d = new Date(baseTime - daysAgo * 24 * 60 * 60 * 1000);
        d.setHours(hour, Math.floor(Math.random() * 60), 0);
        return d.toISOString();
    };

    // --- 3. Retail History Ledger ---
    demoTransactions.push({
        id: "TX-78102",
        timestamp: getPastDate(5, 10),
        customer: { name: "Aria Thorne", phone: "+1 (555) 901-2345" },
        paymentMethod: "card",
        subtotal: 179.99,
        discountPercent: 10,
        discountAmount: 18.00,
        taxPercent: 8,
        taxAmount: 12.96,
        grandTotal: 174.95,
        profit: 89.95,
        items: [{ id: "p1", name: "Aura Noise-Cancelling Headphones", sku: "ELE-HEAD-90", qty: 1, sellingPrice: 179.99, costPrice: 85.00 }]
    });

    demoTransactions.push({
        id: "TX-78103",
        timestamp: getPastDate(3, 14),
        customer: { name: "Guest Customer" },
        paymentMethod: "cash",
        subtotal: 56.00,
        discountPercent: 0,
        discountAmount: 0.00,
        taxPercent: 8,
        taxAmount: 4.48,
        grandTotal: 60.48,
        profit: 26.50,
        items: [
            { id: "p5", name: "Nordic Minimalist Ceramic Vase", sku: "HOM-VASE-03", qty: 1, sellingPrice: 34.00, costPrice: 11.50 },
            { id: "p8", name: "Premium Single-Origin Coffee Beans", sku: "BEV-COFF-42", qty: 1, sellingPrice: 22.00, costPrice: 9.00 }
        ]
    });

    demoTransactions.push({
        id: "TX-78104",
        timestamp: getPastDate(0, 9), // Today 9:00 AM
        customer: { name: "Marcus Broadus", phone: "+1 (555) 789-0123" },
        paymentMethod: "mobile",
        subtotal: 123.50,
        discountPercent: 0,
        discountAmount: 0.00,
        taxPercent: 8,
        taxAmount: 9.88,
        grandTotal: 133.38,
        profit: 60.50,
        items: [
            { id: "p3", name: "Heritage Denim Trucker Jacket", sku: "APP-DENM-55", qty: 1, sellingPrice: 89.50, costPrice: 32.00 },
            { id: "p5", name: "Nordic Minimalist Ceramic Vase", sku: "HOM-VASE-03", qty: 1, sellingPrice: 34.00, costPrice: 11.50 }
        ]
    });

    // --- 4. Wholesale Credit B2B Invoices Ledger ---
    demoWholesaleTransactions.push({
        id: "W-INV-4501",
        timestamp: getPastDate(4, 11),
        customer: demoCustomers[0], // Eleanor Vance (Vance Tech Distributors)
        salesman: "Shemal",
        paymentMethod: "store-credit",
        subtotal: 2430.00,
        discountPercent: 5,
        discountAmount: 121.50,
        taxPercent: 8,
        taxAmount: 184.68,
        grandTotal: 2493.18,
        amountPaid: 13.18, // Paid a partial cash amount on account
        outstandingBalance: 2480.00, // Remaining active credit debt
        profit: 1010.00,
        billingTerms: "Net 30 Account",
        status: "unpaid",
        items: [
            { id: "p1", name: "Aura Noise-Cancelling Headphones", sku: "ELE-HEAD-90", qty: 12, sellingPrice: 135.00, costPrice: 85.00 },
            { id: "p2", name: "Zenith Waterproof Smartwatch", sku: "ELE-SMAR-12", qty: 6, sellingPrice: 190.00, costPrice: 110.00 }
        ]
    });

    demoWholesaleTransactions.push({
        id: "W-INV-4502",
        timestamp: getPastDate(1, 15),
        customer: demoCustomers[3], // Devon Lane (Lane Boutiques LLC)
        salesman: "Kaveen",
        paymentMethod: "bank-wire",
        subtotal: 1240.00,
        discountPercent: 10,
        discountAmount: 124.00,
        taxPercent: 8,
        taxAmount: 89.28,
        grandTotal: 1205.28,
        amountPaid: 1205.28, // Paid immediately via bank wire transfer
        outstandingBalance: 0.00,
        profit: 520.00,
        billingTerms: "Bank Wire Transfer",
        status: "paid",
        items: [
            { id: "p3", name: "Heritage Denim Trucker Jacket", sku: "APP-DENM-55", qty: 20, sellingPrice: 62.00, costPrice: 32.00 }
        ]
    });

    // 5. Notifications
    const demoNotifications = [
        { id: "n1", type: "warning", title: "Low Stock Warning", msg: "Aroma Ultrasonic Diffuser Set is critically low (3 remaining).", time: new Date(baseTime - 120 * 60 * 1000).toISOString() },
        { id: "n2", type: "danger", title: "Out of Stock", msg: "Organic Ceremonial Matcha Set has sold out completely.", time: new Date(baseTime - 300 * 60 * 1000).toISOString() }
    ];

    // --- 5. B2B Cheques Ledger ---
    const demoCheques = [
        {
            id: "chq-mock1",
            chequeNumber: "CHQ-702319",
            customer: { id: "c1", name: "Vance Tech Distributors", companyName: "Vance Tech Distributors" },
            amount: 1000.00,
            bankName: "Sampath Bank",
            branchName: "Colombo 03",
            receivedDate: getPastDate(2, 10).substring(0, 10),
            depositDate: getPastDate(-2, 10).substring(0, 10), // planned for deposit in 2 days
            emergencyRequestDate: "",
            status: "pending",
            invoiceId: "W-INV-4501"
        },
        {
            id: "chq-mock2",
            chequeNumber: "CHQ-890123",
            customer: { id: "c3", name: "Thorne Logistics", companyName: "Thorne Logistics" },
            amount: 500.00,
            bankName: "Commercial Bank",
            branchName: "Galle Face",
            receivedDate: getPastDate(5, 9).substring(0, 10),
            depositDate: getPastDate(1, 9).substring(0, 10),
            emergencyRequestDate: getPastDate(-4, 9).substring(0, 10), // postponed to a future date
            status: "postponed",
            invoiceId: null
        }
    ];

    state.products = demoProducts;
    state.customers = demoCustomers;
    state.transactions = demoTransactions;
    state.wholesaleTransactions = demoWholesaleTransactions;
    state.notifications = demoNotifications;
    state.cheques = demoCheques;
    
    saveStateToServer();
}

async function loadStateFromServer() {
    try {
        const response = await fetch('/api/state', { cache: 'no-store' });
        if (response.ok) {
            const parsed = await response.json();
            state.products = parsed.products || [];
            state.transactions = parsed.transactions || [];
            state.wholesaleTransactions = parsed.wholesaleTransactions || [];
            state.customers = parsed.customers || [];
            state.notifications = parsed.notifications || [];
            state.cheques = parsed.cheques || [];
            state.purchaseInvoices = parsed.purchaseInvoices || [];
            state.expenses = parsed.expenses || [];
            state.employees = parsed.employees || [];
            state.categories = parsed.categories || [];
            if (state.categories.length === 0) {
                state.categories = ["Engine Oil", "Gear Oil", "Grease", "Coolants", "Additives"];
            }
            if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
            
            // Migration: replace old brand name with new brand name
            if (!state.settings.storeName || state.settings.storeName === "S&S Retail") {
                state.settings.storeName = "Thriller Motors (Pvt) Ltd";
            }
            if (!state.settings.receiptFooter || state.settings.receiptFooter.includes("S&S Retail")) {
                state.settings.receiptFooter = "Thank you for choosing Thriller Motors (Pvt) Ltd! Drive safely.";
            }
        } else {
            console.log("No existing state on server, starting with empty state.");
        }
    } catch (e) {
        console.error("Server Fetch error:", e);
    }
}

async function saveStateToServer() {
    try {
        const response = await fetch('/api/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                products: state.products,
                transactions: state.transactions,
                wholesaleTransactions: state.wholesaleTransactions,
                customers: state.customers,
                notifications: state.notifications,
                cheques: state.cheques,
                purchaseInvoices: state.purchaseInvoices,
                expenses: state.expenses,
                employees: state.employees,
                categories: state.categories,
                settings: state.settings
            })
        });
        if (!response.ok) {
            const errData = await response.json().catch(()=>({}));
            alert("Database Error! Failed to save. " + (errData.message || response.statusText));
            console.error("Save Error Response:", errData);
        }
    } catch (err) {
        alert("Network Error! Could not connect to the server.");
        console.error("Failed to save state to server:", err);
    }
}

// --------------------------------------------------------------------------
// 2. Global Utilities & DOM Listeners
// --------------------------------------------------------------------------
let salesChart = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initial State Load
    await loadStateFromServer();
    renderCategoryManager();

    // Login Screen Logic
    const loginScreen = document.getElementById("login-screen");
    const appContainer = document.querySelector(".app-container");
    const btnLogin = document.getElementById("btn-login");
    const loginUser = document.getElementById("login-username");
    const loginPass = document.getElementById("login-password");
    const loginError = document.getElementById("login-error");

    if (sessionStorage.getItem("ss_logged_in") === "true" || localStorage.getItem("thriller_motors_logged_in") === "true") {
        if(loginScreen) loginScreen.style.display = "none";
        if(appContainer) appContainer.style.display = "flex";
    } else {
        if(appContainer) appContainer.style.display = "none"; // Hide main app
        
        const handleLogin = () => {
            const enteredUser = loginUser ? loginUser.value.trim() : "";
            const enteredPass = loginPass.value;
            const currentSysPass = state.settings.systemPassword || "Thriller123";
            
            if (enteredUser === "Thrillermotors" && enteredPass === currentSysPass) {
                sessionStorage.setItem("ss_logged_in", "true");
                loginScreen.style.opacity = "0";
                appContainer.style.display = "flex"; // Restore flex layout
                setTimeout(() => loginScreen.style.display = "none", 400);
            } else {
                loginError.style.display = "block";
                loginPass.value = "";
                if(loginUser) loginUser.value = "";
                if(loginUser) loginUser.focus();
            }
        };

        if(btnLogin) btnLogin.addEventListener("click", handleLogin);
        if(loginPass) {
            loginPass.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleLogin();
            });
        }
        if(loginUser) {
            loginUser.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleLogin();
            });
        }
    }
    
    // Apply Settings
    applyThemeAccent(state.settings.accentColor);
    document.getElementById("sidebar-shop-name").innerText = state.settings.storeName;
    document.getElementById("setting-store-name").value = state.settings.storeName;
    document.getElementById("setting-currency").value = state.settings.currency;
    document.getElementById("setting-tax-rate").value = state.settings.taxRate;
    document.getElementById("setting-store-address").value = state.settings.address;
    document.getElementById("setting-store-phone").value = state.settings.phone;
    document.getElementById("setting-receipt-footer").value = state.settings.receiptFooter;
    document.getElementById("setting-low-stock-limit").value = state.settings.lowStockLimit;
    
    // Toggle theme icon on start
    const theme = localStorage.getItem("ss_theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeUI(theme);

    // 2. Setup Events
    setupRouterEvents();
    setupPOSCartEvents();
    setupWholesalePOSEvents();
    setupWholesaleLedgerEvents();
    setupProductInventoryEvents();
    setupRestockEvents();
    setupCustomerEvents();
    setupSettingsEvents();
    setupHeaderEvents();
    setupChequeRegistryEvents();
    initPurchaseInvoiceModule();
    
    // 3. Render Dashboard on start
    refreshAllViews();
    
    // 4. Live Clock Start
    setInterval(updateLiveClock, 1000);
    updateLiveClock();
});

// Live Digital Clock
function updateLiveClock() {
    const clockEl = document.getElementById("live-clock");
    if (clockEl) {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

function updateThemeUI(theme) {
    const themeText = document.getElementById("theme-text");
    if (themeText) {
        themeText.innerText = theme === "dark" ? "Dark Mode" : "Light Mode";
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("ss_theme", nextTheme);
    updateThemeUI(nextTheme);
}

// Global UI refresh scheduler
function refreshAllViews() {
    renderDashboard();
    renderPOSCatalog();
    renderWholesalePOSCatalog();
    renderWholesaleLedger();
    renderInventory();
    renderTransactions();
    renderCustomers();
    renderCartUI();
    renderWholesaleCartUI();
    renderCheques();
    updateNotificationsUI();
    if (typeof renderPurchaseInvoices === 'function') renderPurchaseInvoices();
    if (typeof renderExpensesTab === 'function') renderExpensesTab();
}

// --------------------------------------------------------------------------
// 3. Header & Notifications Controller
// --------------------------------------------------------------------------
function setupHeaderEvents() {
    const searchInput = document.getElementById("global-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 0) {
                if (state.activeTab !== "pos" && state.activeTab !== "wholesale-pos" && state.activeTab !== "inventory") {
                    switchTab("pos");
                }
                
                if (state.activeTab === "pos") {
                    document.getElementById("pos-search").value = query;
                    renderPOSCatalog();
                } else if (state.activeTab === "wholesale-pos") {
                    document.getElementById("w-pos-search").value = query;
                    renderWholesalePOSCatalog();
                } else if (state.activeTab === "inventory") {
                    document.getElementById("inventory-search").value = query;
                    renderInventory();
                }
            }
        });
    }

    const bellBtn = document.getElementById("btn-notifications");
    const dropdown = document.getElementById("notification-dropdown");
    if (bellBtn && dropdown) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });
    }

    document.getElementById("btn-lock-system")?.addEventListener("click", () => {
        sessionStorage.removeItem("ss_logged_in");
        document.querySelector(".app-container").style.display = "none";
        const loginScreen = document.getElementById("login-screen");
        if (loginScreen) {
            loginScreen.style.display = "flex";
            setTimeout(() => loginScreen.style.opacity = "1", 10);
            document.getElementById("login-password").value = "";
            document.getElementById("login-error").style.display = "none";
        }
    });

    document.addEventListener("click", () => {
        if (dropdown) dropdown.classList.remove("active");
    });

    const clearNotifyBtn = document.getElementById("btn-clear-notifications");
    if (clearNotifyBtn) {
        clearNotifyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            state.notifications = [];
            saveStateToServer();
            updateNotificationsUI();
        });
    }

    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }
}

function triggerNotification(type, title, msg) {
    const notifyObj = {
        id: "n-" + Date.now(),
        type: type,
        title: title,
        msg: msg,
        time: new Date().toISOString()
    };
    state.notifications.unshift(notifyObj);
    saveStateToServer();
    updateNotificationsUI();
}

function updateNotificationsUI() {
    const listEl = document.getElementById("notification-list");
    const badgeEl = document.getElementById("notifications-count");
    if (!listEl) return;

    if (state.notifications.length === 0) {
        listEl.innerHTML = `<div class="empty-notifications">No active alerts available</div>`;
        if (badgeEl) badgeEl.style.display = "none";
        return;
    }

    if (badgeEl) {
        badgeEl.style.display = "block";
        badgeEl.innerText = state.notifications.length;
    }

    listEl.innerHTML = state.notifications.map(n => {
        let icon = '<i class="fa-solid fa-bell"></i>';
        if (n.type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
        if (n.type === 'danger') icon = '<i class="fa-solid fa-circle-xmark"></i>';
        if (n.type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        
        const friendlyTime = new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="notification-item ${n.type}">
                ${icon}
                <div class="notification-item-content">
                    <span class="notification-title">${n.title}</span>
                    <span class="notification-msg">${n.msg}</span>
                    <span class="notification-time">${friendlyTime}</span>
                </div>
            </div>
        `;
    }).join('');
}

// --------------------------------------------------------------------------
// 4. Single Page Application (SPA) Router
// --------------------------------------------------------------------------
function setupRouterEvents() {
    const navButtons = document.querySelectorAll(".sidebar-nav .nav-btn");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            if (targetTab === "owner" && !state.isOwnerUnlocked) {
                document.getElementById("owner-password").value = "";
                document.getElementById("modal-owner-login").style.display = "flex";
                return;
            }
            switchTab(targetTab);
        });
    });

    // Owner Login Modal Events
    document.getElementById("close-owner-login")?.addEventListener("click", () => {
        document.getElementById("modal-owner-login").style.display = "none";
    });
    document.getElementById("btn-cancel-owner")?.addEventListener("click", () => {
        document.getElementById("modal-owner-login").style.display = "none";
    });
    document.getElementById("btn-unlock-owner")?.addEventListener("click", () => {
        const pwd = document.getElementById("owner-password").value;
        const currentOwnerPass = state.settings.ownerPassword || "admin123";
        if (pwd === currentOwnerPass) {
            state.isOwnerUnlocked = true;
            document.getElementById("modal-owner-login").style.display = "none";
            switchTab("owner");
        } else {
            alert("Incorrect Password! Access Denied.");
        }
    });
}

function switchTab(tabId) {
    if (!tabId) return;

    if (tabId !== "owner") {
        state.isOwnerUnlocked = false;
    }
    
    state.activeTab = tabId;
    
    document.querySelectorAll(".sidebar-nav .nav-btn").forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    document.querySelectorAll(".main-content .tab-pane").forEach(pane => {
        if (pane.id === `tab-${tabId}`) {
            pane.classList.add("active");
        } else {
            pane.classList.remove("active");
        }
    });

    if (tabId === "dashboard") {
        renderDashboard();
    } else if (tabId === "owner") {
        renderOwnerDashboard();
    } else if (tabId === "pos") {
        renderPOSCatalog();
    } else if (tabId === "wholesale-pos") {
        renderWholesalePOSCatalog();
    } else if (tabId === "wholesale-ledger") {
        renderWholesaleLedger();
    } else if (tabId === "cash-credit") {
        renderCashCreditTab();
    } else if (tabId === "inventory") {
        renderInventory();
    } else if (tabId === "transactions") {
        renderTransactions();
    } else if (tabId === "customers") {
        renderCustomers();
    } else if (tabId === "cheque-registry") {
        renderCheques();
    } else if (tabId === "purchases") {
        renderPurchaseInvoices();
    } else if (tabId === "expenses") {
        renderExpensesTab();
    }
}

// --------------------------------------------------------------------------
// 5. Dashboard Controller & Analytics (Chart.js Integration)
// --------------------------------------------------------------------------

function renderCashCreditTab() {
    const totalDebt = state.customers.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
    const totalDebtEl = document.getElementById("cash-credit-total-debt");
    if (totalDebtEl) {
        totalDebtEl.innerText = `${state.settings.currency}${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const tbody = document.getElementById("cash-credit-table-body");
    if (!tbody) return;

    const debtors = state.customers.filter(c => (c.outstandingDebt || 0) > 0 || c.accountType === "cash-credit");

    if (debtors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No cash credit customers or outstanding balances found.</td></tr>`;
        return;
    }

    tbody.innerHTML = debtors.map(c => `
        <tr>
            <td style="font-weight: 500;">
                <div>${c.companyName || c.name}</div>
                ${c.companyName ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${c.name}</div>` : ''}
            </td>
            <td>${c.phone || '-'}</td>
            <td>${state.settings.currency}${(c.creditLimit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="color: var(--danger); font-weight: 600;">${state.settings.currency}${c.outstandingDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>
                <div style="display:flex; gap: 8px;">
                    <button class="btn btn-primary btn-xs" style="background-color:var(--success);" title="Collect Payment" onclick="openCashCreditPaymentModal('${c.id}')">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Collect Payment
                    </button>
                    <button class="btn btn-secondary btn-xs" title="View Payment History" onclick="openPaymentHistoryModal('${c.id}')">
                        <i class="fa-solid fa-clock-rotate-left"></i> View History
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openManualCreditModal() {
    const modal = document.getElementById("modal-manual-credit");
    const select = document.getElementById("mc-customer");
    if (!modal || !select) return;

    // Populate dropdown
    select.innerHTML = '<option value="">-- Choose Customer --</option>' + 
        state.customers.map(c => `<option value="${c.id}">${c.companyName || c.name} (${c.phone || 'No phone'})</option>`).join('');

    document.getElementById("mc-amount").value = "";
    document.getElementById("mc-note").value = "";
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("mc-date").value = today;
    document.getElementById("mc-note").value = "";

    modal.style.display = "flex";
}

function closeManualCreditModal() {
    const modal = document.getElementById("modal-manual-credit");
    if (modal) modal.style.display = "none";
}

function openCashCreditPaymentModal(customerId) {
    // We need to find the oldest unpaid invoice for this customer to map to the debt modal.
    // If the modal expects an invoiceId, we will pass the first one that has an outstanding balance.
    const unpaidTxs = state.wholesaleTransactions.filter(t => t.customer.id === customerId && t.outstandingBalance > 0);
    if (unpaidTxs.length > 0) {
        // Find the oldest one
        unpaidTxs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        openDebtRepaymentModal(unpaidTxs[0].id);
    } else {
        alert("No outstanding wholesale invoices found for this customer to collect against.");
    }
}

function openPaymentHistoryModal(customerId) {
    const modal = document.getElementById("modal-payment-history");
    const tbody = document.getElementById("payment-history-tbody");
    const summary = document.getElementById("payment-history-summary");
    if (!modal || !tbody || !summary) return;

    const cust = state.customers.find(c => c.id === customerId);
    if (!cust) return;

    const allPayments = [];
    state.wholesaleTransactions.forEach(tx => {
        if (tx.customer.id === customerId && tx.paymentHistory) {
            tx.paymentHistory.forEach(ph => {
                allPayments.push({
                    date: new Date(ph.date),
                    invoiceId: tx.id,
                    amount: ph.amount,
                    method: ph.method
                });
            });
        }
    });

    allPayments.sort((a, b) => b.date - a.date);

    summary.innerHTML = `Customer: ${cust.companyName || cust.name} <br> Total Outstanding: ${state.settings.currency}${(cust.outstandingDebt || 0).toFixed(2)}`;

    if (allPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">No recorded payment history found for this customer.</td></tr>`;
    } else {
        tbody.innerHTML = allPayments.map(p => `
            <tr>
                <td>${p.date.toLocaleString()}</td>
                <td><span class="badge badge-secondary">${p.invoiceId}</span></td>
                <td style="text-transform: capitalize;">${p.method.replace('-', ' ')}</td>
                <td style="text-align:right; font-weight:600; color:var(--success);">${state.settings.currency}${p.amount.toFixed(2)}</td>
            </tr>
        `).join('');
    }

    modal.classList.add("active");
}

function closePaymentHistoryModal() {
    const modal = document.getElementById("modal-payment-history");
    if (modal) modal.classList.remove("active");
}

function renderOwnerDashboard() {
    const totalRetail = state.transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalWholesale = state.wholesaleTransactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalRev = totalRetail + totalWholesale;

    const profitRetail = state.transactions.reduce((sum, tx) => sum + tx.profit, 0);
    const profitWholesale = state.wholesaleTransactions.reduce((sum, tx) => sum + tx.profit, 0);
    const totalProfit = profitRetail + profitWholesale;

    let totalCashSales = totalRetail;
    let totalCreditSales = 0;

    state.wholesaleTransactions.forEach(tx => {
        if (tx.paymentMethod === 'credit' || tx.paymentMethod === 'store-credit') {
            totalCreditSales += tx.grandTotal;
        } else if (tx.paymentMethod === 'cash-credit') {
            const upfrontPayment = tx.paymentHistory?.find(ph => ph.method === "cash-credit-upfront")?.amount || 0;
            totalCashSales += upfrontPayment;
            totalCreditSales += (tx.grandTotal - upfrontPayment);
        } else {
            totalCashSales += tx.grandTotal;
        }
    });

    const elTotal = document.getElementById("owner-stat-total-rev");
    const elCashSales = document.getElementById("owner-stat-cash-sales");
    const elCreditSales = document.getElementById("owner-stat-credit-sales");
    const elProfit = document.getElementById("owner-stat-profit");

    const totalExpenses = (state.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    if(elTotal) elTotal.innerText = `${state.settings.currency}${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if(elCashSales) elCashSales.innerText = `${state.settings.currency}${totalCashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if(elCreditSales) elCreditSales.innerText = `${state.settings.currency}${totalCreditSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if(elProfit) elProfit.innerText = `${state.settings.currency}${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalStockValue = state.products.reduce((sum, p) => {
        if (p.isBundle) return sum;
        const qty = parseFloat(getProductStock(p)) || 0;
        const cost = parseFloat(p.costPrice) || 0;
        return sum + (qty * cost);
    }, 0);
    const elStockValue = document.getElementById("owner-stat-stock-value");
    if(elStockValue) elStockValue.innerText = `${state.settings.currency}${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalWholesaleStockValue = state.products.reduce((sum, p) => {
        if (p.isBundle) return sum;
        const qty = parseFloat(getProductStock(p)) || 0;
        const wPrice = parseFloat(p.wholesalePrice) || (parseFloat(p.sellingPrice) * 0.8) || 0;
        return sum + (qty * wPrice);
    }, 0);
    const elWholesaleStockValue = document.getElementById("owner-stat-wholesale-stock");
    if(elWholesaleStockValue) elWholesaleStockValue.innerText = `${state.settings.currency}${totalWholesaleStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    renderOwnerSalesChart();
}

let ownerSalesChart = null;
function renderOwnerSalesChart() {
    const canvas = document.getElementById("ownerSalesChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ownerSalesChart) {
        ownerSalesChart.destroy();
    }

    const currentYear = new Date().getFullYear();
    const yearlyTxs = state.wholesaleTransactions.filter(tx => new Date(tx.timestamp).getFullYear() === currentYear);

    const shemalMonthly = Array(12).fill(0);
    const kaveenMonthly = Array(12).fill(0);

    yearlyTxs.forEach(tx => {
        const monthIndex = new Date(tx.timestamp).getMonth();
        const salesman = tx.salesman || "Shemal"; 
        
        if (salesman === "Shemal") {
            shemalMonthly[monthIndex] += tx.grandTotal;
        } else if (salesman === "Kaveen") {
            kaveenMonthly[monthIndex] += tx.grandTotal;
        }
    });

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    ownerSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Shemal',
                    data: shemalMonthly,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    label: 'Kaveen',
                    data: kaveenMonthly,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

function renderDashboard() {
    // aggregates taking account of both retail and B2B wholesale transactions
    const totalRetail = state.transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalWholesale = state.wholesaleTransactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalRev = totalRetail + totalWholesale;

    const profitRetail = state.transactions.reduce((sum, tx) => sum + tx.profit, 0);
    const profitWholesale = state.wholesaleTransactions.reduce((sum, tx) => sum + tx.profit, 0);
    const totalProfit = profitRetail + profitWholesale;

    const lowStockCount = state.products.filter(p => getProductStock(p) <= state.settings.lowStockLimit).length;
    const totalTxCount = state.transactions.length + state.wholesaleTransactions.length;

    document.getElementById("stat-revenue").innerText = `${state.settings.currency}${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("stat-retail-revenue").innerText = `${state.settings.currency}${totalRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("stat-wholesale-revenue").innerText = `${state.settings.currency}${totalWholesale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("stat-low-stock").innerText = lowStockCount;

    if (lowStockCount > 0) {
        document.getElementById("stat-low-stock-label").innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Reorder ${lowStockCount} Items`;
        document.getElementById("stat-low-stock-label").className = "stat-trend trend-down";
    } else {
        document.getElementById("stat-low-stock-label").innerText = "All Inventory Healthy";
        document.getElementById("stat-low-stock-label").className = "stat-trend trend-up";
    }

    renderChart("week");

    // Charts filter toggle binding
    const chartPeriodBtns = document.querySelectorAll(".chart-actions button");
    chartPeriodBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            chartPeriodBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const period = btn.getAttribute("data-chart-period");
            renderChart(period);
        });
    });

    // Render Stock Alerts
    const lowStockBody = document.getElementById("dashboard-low-stock-body");
    const lowStockList = state.products.filter(p => getProductStock(p) <= state.settings.lowStockLimit);
    
    if (lowStockList.length === 0) {
        lowStockBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-circle-check" style="font-size:24px; color:var(--success); margin-bottom:10px; display:block;"></i>All items fully stocked!</td></tr>`;
    } else {
        lowStockBody.innerHTML = lowStockList.map(p => {
            const statusBadge = getProductStock(p) === 0 
                ? '<span class="badge badge-danger">Out of Stock</span>' 
                : '<span class="badge badge-warning">Low Stock</span>';
            
            return `
                <tr>
                    <td>
                        <div class="product-info-cell">
                            <span class="product-cell-name">${p.name}</span>
                            <span class="product-cell-sku">${p.sku || "N/A"}</span>
                        </div>
                    </td>
                    <td><strong>${getProductStock(p)}</strong> units</td>
                    <td>${statusBadge}</td>
                    <td><button class="btn btn-secondary btn-xs" onclick="openRestockModal('${p.id}')">Restock</button></td>
                </tr>
            `;
        }).join('');
    }

    // Render Recent Sales
    const recentBody = document.getElementById("dashboard-recent-sales-body");
    const sortedTx = [...state.transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    if (sortedTx.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No sales processed yet today.</td></tr>`;
    } else {
        recentBody.innerHTML = sortedTx.map(tx => {
            const dateObj = new Date(tx.timestamp);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <tr>
                    <td><strong>${tx.id}</strong></td>
                    <td>${timeStr}</td>
                    <td>${tx.customer?.name || "Guest Customer"}</td>
                    <td>${tx.items.length} items</td>
                    <td><span class="badge badge-secondary" style="text-transform:uppercase;">${tx.paymentMethod}</span></td>
                    <td class="text-primary" style="font-weight:700;">${state.settings.currency}${tx.grandTotal.toFixed(2)}</td>
                    <td><button class="btn btn-secondary btn-xs" onclick="viewReceipt('${tx.id}')"><i class="fa-solid fa-receipt"></i> Invoice</button></td>
                </tr>
            `;
        }).join('');
    }
}

function renderChart(period) {
    const canvas = document.getElementById("salesChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (salesChart) {
        salesChart.destroy();
    }

    const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#10b981';
    
    let labels = [];
    let salesData = [];
    let profitData = [];
    const baseTime = Date.now();

    if (period === "today") {
        labels = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM"];
        salesData = Array(labels.length).fill(0);
        profitData = Array(labels.length).fill(0);
        
        // Aggregate real sales data (Retail and wholesale totals combined)
        const combinedList = [...state.transactions, ...state.wholesaleTransactions];
        const todayTxs = combinedList.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString());
        
        if (todayTxs.length > 0) {
            todayTxs.forEach(tx => {
                const hour = new Date(tx.timestamp).getHours();
                let index = hour - 9;
                if (index >= 0 && index < labels.length) {
                    salesData[index] += tx.grandTotal;
                    profitData[index] += tx.profit;
                }
            });
        } else {
            // Mock display defaults
            salesData = [150, 420, 680, 490, 250, 520, 780, 890, 410, 150];
            profitData = [65, 180, 290, 210, 110, 220, 310, 390, 180, 65];
        }

    } else if (period === "week") {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseTime - i * 24 * 60 * 60 * 1000);
            labels.push(d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' }));
            
            // Retail Sales
            const dayRetail = state.transactions.filter(t => new Date(t.timestamp).toDateString() === d.toDateString());
            // Wholesale Sales
            const dayWholesale = state.wholesaleTransactions.filter(t => new Date(t.timestamp).toDateString() === d.toDateString());
            
            const salesSum = dayRetail.reduce((sum, tx) => sum + tx.grandTotal, 0) + dayWholesale.reduce((sum, tx) => sum + tx.grandTotal, 0);
            const profitSum = dayRetail.reduce((sum, tx) => sum + tx.profit, 0) + dayWholesale.reduce((sum, tx) => sum + tx.profit, 0);
            
            salesData.push(salesSum);
            profitData.push(profitSum);
        }
    } else if (period === "month") {
        labels = ["Week 1", "Week 2", "Week 3", "Week 4 (Current)"];
        salesData = [2400, 3100, 4800, 1200];
        profitData = [980, 1350, 2100, 510];
        
        const combinedList = [...state.transactions, ...state.wholesaleTransactions];
        const weekTxs = combinedList.filter(t => {
            const diffTime = baseTime - new Date(t.timestamp).getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        });
        
        if (weekTxs.length > 0) {
            salesData[3] = weekTxs.reduce((sum, tx) => sum + tx.grandTotal, 0);
            profitData[3] = weekTxs.reduce((sum, tx) => sum + tx.profit, 0);
        }
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textMain = isDark ? "#f3f4f6" : "#1f2937";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gross Sales Revenue',
                    data: salesData,
                    borderColor: activeColor,
                    backgroundColor: activeColor + '10',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: activeColor,
                    pointHoverRadius: 7
                },
                {
                    label: 'Net Profits',
                    data: profitData,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointBackgroundColor: '#a855f7',
                    pointHoverRadius: 6,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textMain,
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#ffffff' : '#1f2937',
                    bodyColor: isDark ? '#9ca3af' : '#4b5563',
                    borderColor: activeColor + '40',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    titleFont: { family: 'Outfit', weight: '700' },
                    bodyFont: { family: 'Inter' }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textMain, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { 
                        color: textMain, 
                        font: { family: 'Inter', size: 11 },
                        callback: function(value) {
                            return state.settings.currency + value;
                        }
                    }
                }
            }
        }
    });
}

function openRestockModal(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;
    
    const modal = document.getElementById("modal-restock");
    if (!modal) return;

    document.getElementById("restock-product-id").value = prod.id;
    document.getElementById("restock-product-name").value = prod.name;
    document.getElementById("restock-product-sku").value = prod.sku || "N/A";
    document.getElementById("restock-current-stock").value = prod.stock;
    
    // Clear previous input
    document.getElementById("restock-quantity").value = "";
    
    modal.classList.add("active");
}

function closeRestockModal() {
    const modal = document.getElementById("modal-restock");
    if (modal) modal.classList.remove("active");
}

function setupRestockEvents() {
    document.getElementById("btn-close-restock-modal")?.addEventListener("click", closeRestockModal);
    document.getElementById("btn-cancel-restock-modal")?.addEventListener("click", closeRestockModal);
    
    const form = document.getElementById("restock-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            processProductRestock();
        });
    }
}

function processProductRestock() {
    const productId = document.getElementById("restock-product-id").value;
    const addQty = parseInt(document.getElementById("restock-quantity").value) || 0;
    
    if (addQty <= 0) {
        alert("Please enter a valid positive quantity to add to stock!");
        return;
    }
    
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;
    
    // Auto-sum existing and incoming stock
    const oldStock = prod.stock;
    prod.stock += addQty;
    
    saveStateToServer();
    closeRestockModal();
    refreshAllViews();
    
    // Trigger real-time dashboard notifications
    triggerNotification("success", "Stock Restocked", `${prod.name} stock increased by ${addQty} (Old: ${oldStock} -> New: ${getProductStock(prod)}).`);
    alert(`Successfully added ${addQty} units to "${prod.name}"!\n\nOld Stock: ${oldStock}\nIncoming: ${addQty}\nNew Total Stock: ${getProductStock(prod)}`);
}

// --------------------------------------------------------------------------
// 6. Point of Sale (POS) Controller & Checkout Engine (RETAIL)
// --------------------------------------------------------------------------
let activeCategoryFilter = "all";

function setupPOSCartEvents() {
    const search = document.getElementById("pos-search");
    if (search) {
        search.addEventListener("input", renderPOSCatalog);
    }

    const clearBtn = document.getElementById("btn-clear-cart");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            state.cart = [];
            renderCartUI();
        });
    }

    const discInput = document.getElementById("cart-discount-input");
    const discTypeSelect = document.getElementById("cart-discount-type");
    if (discInput) discInput.addEventListener("input", renderCartUI);
    if (discTypeSelect) discTypeSelect.addEventListener("change", renderCartUI);

    const holdBtn = document.getElementById("btn-hold-sale");
    if (holdBtn) {
        holdBtn.addEventListener("click", () => {
            if (state.cart.length === 0) {
                alert("Your cart is empty. Nothing to place on hold!");
                return;
            }
            triggerNotification("info", "Sale On Hold", `Retail sale with ${state.cart.length} items put on hold.`);
            state.cart = [];
            renderCartUI();
        });
    }

    const payBtn = document.getElementById("btn-checkout-pay");
    if (payBtn) {
        payBtn.addEventListener("click", processCartCheckout);
    }

    const addCustPos = document.getElementById("btn-add-customer-pos");
    if (addCustPos) {
        addCustPos.addEventListener("click", () => {
            openCustomerModal();
        });
    }

    const custSearch = document.getElementById("cart-customer-search");
    if (custSearch) {
        custSearch.addEventListener("input", renderCartUI);
    }
}

function renderPOSCatalog() {
    const grid = document.getElementById("pos-catalog-grid");
    const pillsContainer = document.getElementById("pos-categories");
    if (!grid) return;

    const categories = ["all", ...new Set(state.products.map(p => p.category))];
    
    pillsContainer.innerHTML = categories.map(cat => {
        const title = cat === "all" ? "All Items" : cat;
        const activeClass = activeCategoryFilter === cat ? "active" : "";
        return `<button class="pill ${activeClass}" data-category="${cat}">${title}</button>`;
    }).join('');

    pillsContainer.querySelectorAll(".pill").forEach(pill => {
        pill.addEventListener("click", () => {
            activeCategoryFilter = pill.getAttribute("data-category");
            renderPOSCatalog();
        });
    });

    const searchQuery = document.getElementById("pos-search")?.value.toLowerCase() || "";
    
    let filteredList = state.products;

    if (activeCategoryFilter !== "all") {
        filteredList = filteredList.filter(p => p.category === activeCategoryFilter);
    }

    if (searchQuery.length > 0) {
        filteredList = filteredList.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            (p.sku && p.sku.toLowerCase().includes(searchQuery))
        );
    }

    if (filteredList.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart-state" style="grid-column: 1/-1; padding: 60px;">
                <i class="fa-solid fa-box-open"></i>
                <p>No matching products found</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredList.map(p => {
        let stockTag = `<span class="stock-tag">${getProductStock(p)} In Stock</span>`;
        if (getProductStock(p) === 0) {
            stockTag = `<span class="stock-tag out-tag">SOLD OUT</span>`;
        } else if (getProductStock(p) <= state.settings.lowStockLimit) {
            stockTag = `<span class="stock-tag low-tag">${getProductStock(p)} Low Stock</span>`;
        }

        const fallbackImg = PRESET_IMAGES[p.category] || PRESET_IMAGES.Default;
        const prodImg = p.img && p.img.trim().startsWith("http") ? p.img : fallbackImg;

        return `
            <div class="product-card" onclick="addProductToCart('${p.id}')" style="min-height: 160px; padding-top: 35px; padding-bottom: 5px; position: relative;">
                ${stockTag}
                <div class="prod-card-details">
                    <span class="prod-card-category">${p.category}</span>
                    <span class="prod-card-title">${p.name}</span>
                    <div class="prod-card-bottom">
                        <span class="prod-card-price">${state.settings.currency}${p.sellingPrice.toFixed(2)}</span>
                        <div class="prod-card-add-btn">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addProductToCart(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    if (getProductStock(prod) <= 0) {
        alert("This item is currently sold out!");
        return;
    }

    const cartIdx = state.cart.findIndex(item => item.id === productId);
    if (cartIdx > -1) {
        const item = state.cart[cartIdx];
        if (item.qty >= getProductStock(prod)) {
            alert(`Only ${getProductStock(prod)} units are in stock!`);
            return;
        }
        item.qty++;
    } else {
        state.cart.push({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            qty: 1,
            sellingPrice: prod.sellingPrice,
            costPrice: prod.costPrice
        });
    }

    renderCartUI();
}

function updateCartQty(idx, increment) {
    const cartItem = state.cart[idx];
    if (!cartItem) return;

    const prod = state.products.find(p => p.id === cartItem.id);
    if (!prod) return;

    if (increment > 0) {
        if (cartItem.qty >= getProductStock(prod)) {
            alert(`Only ${getProductStock(prod)} units are in stock!`);
            return;
        }
        cartItem.qty++;
    } else {
        cartItem.qty--;
        if (cartItem.qty <= 0) {
            state.cart.splice(idx, 1);
        }
    }

    renderCartUI();
}

window.setCartQty = function(idx, val) {
    const item = state.cart[idx];
    if (!item) return;
    const prod = state.products.find(p => p.id === item.id);
    let qty = parseFloat(val);
    if (isNaN(qty) || qty <= 0) qty = 1;
    if (prod && qty > getProductStock(prod)) {
        alert(`Only ${getProductStock(prod)} units are in stock!`);
        qty = getProductStock(prod);
    }
    item.qty = qty;
    renderCartUI();
};

function removeCartItem(idx) {
    state.cart.splice(idx, 1);
    renderCartUI();
}

function renderCartUI() {
    const cartList = document.getElementById("cart-items-list");
    const subtotalEl = document.getElementById("cart-subtotal");
    const discAmountEl = document.getElementById("cart-discount-value");
    const taxEl = document.getElementById("cart-tax-value");
    const totalEl = document.getElementById("cart-total");
    const countEl = document.getElementById("cart-item-count");
    
    if (!cartList) return;

    const taxRate = parseFloat(state.settings.taxRate) || 0;
    document.getElementById("cart-tax-rate").innerText = taxRate;

    // Populate all B2B customers in select dropdown (Credit & Cash) filtered by search
    const select = document.getElementById("cart-customer-select");
    const searchVal = document.getElementById("cart-customer-search")?.value.toLowerCase().trim() || "";
    if (select) {
        const currentVal = select.value;
        let filteredCustomers = state.customers;
        if (searchVal.length > 0) {
            filteredCustomers = state.customers.filter(c => 
                c.name.toLowerCase().includes(searchVal) || 
                (c.companyName && c.companyName.toLowerCase().includes(searchVal)) ||
                c.phone.includes(searchVal) ||
                (c.address && c.address.toLowerCase().includes(searchVal))
            );
        }
        select.innerHTML = `<option value="guest">Guest Customer (Walk-in)</option>` + 
            filteredCustomers.map(c => {
                const accType = c.creditLimit > 0 ? "Credit" : "Cash";
                return `<option value="${c.id}">${c.companyName || c.name} [${accType}] (${c.phone})</option>`;
            }).join('');
        
        // Restore selected value if still in list, otherwise select guest
        if (filteredCustomers.some(c => c.id === currentVal)) {
            select.value = currentVal;
        } else {
            select.value = "guest";
        }
    }

    if (state.cart.length === 0) {
        cartList.innerHTML = `
            <div class="empty-cart-state">
                <i class="fa-solid fa-cart-arrow-down"></i>
                <p>Your shopping cart is empty.</p>
                <span>Click products on the left to add them to this sale.</span>
            </div>
        `;
        subtotalEl.innerText = `${state.settings.currency}0.00`;
        discAmountEl.innerText = `-${state.settings.currency}0.00`;
        taxEl.innerText = `${state.settings.currency}0.00`;
        totalEl.innerText = `${state.settings.currency}0.00`;
        countEl.innerText = "0 items";
        return;
    }

    countEl.innerText = `${state.cart.reduce((sum, item) => sum + item.qty, 0)} items`;
    cartList.innerHTML = state.cart.map((item, idx) => `
        <div class="cart-item">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price">${state.settings.currency}${(item.sellingPrice * item.qty).toFixed(2)}</span>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateCartQty(${idx}, -1)"><i class="fa-solid fa-minus"></i></button>
                <input type="number" class="qty-val" value="${item.qty}" min="0.01" step="any" onchange="setCartQty(${idx}, this.value)" style="width: 45px; font-size:0.75rem; text-align:center; border:1px solid var(--border-color); background:transparent; color:var(--text-main); border-radius:4px; outline:none; -moz-appearance:textfield;">
                <button class="qty-btn" onclick="updateCartQty(${idx}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="cart-item-remove" onclick="removeCartItem(${idx})"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');

    const subtotal = state.cart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const discVal = parseFloat(document.getElementById("cart-discount-input")?.value) || 0;
    const discType = document.getElementById("cart-discount-type")?.value || "percent";
    const discAmount = discType === "percent" ? (subtotal * (discVal / 100)) : discVal;
    const taxableTotal = Math.max(0, subtotal - discAmount);
    const taxAmount = taxableTotal * (taxRate / 100);
    const grandTotal = taxableTotal + taxAmount;

    subtotalEl.innerText = `${state.settings.currency}${subtotal.toFixed(2)}`;
    discAmountEl.innerText = `-${state.settings.currency}${discAmount.toFixed(2)}`;
    taxEl.innerText = `${state.settings.currency}${taxAmount.toFixed(2)}`;
    totalEl.innerText = `${state.settings.currency}${grandTotal.toFixed(2)}`;
}

function processCartCheckout() {
    if (state.cart.length === 0) {
        alert("The shopping cart is empty!");
        return;
    }

    const customerSelect = document.getElementById("cart-customer-select");
    let customerObj = { name: "Guest Customer" };
    
    if (customerSelect && customerSelect.value !== "guest") {
        const matched = state.customers.find(c => c.id === customerSelect.value);
        if (matched) {
            customerObj = matched;
            matched.purchaseCount = (matched.purchaseCount || 0) + 1;
            
            const totalSpent = state.cart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
            matched.loyaltyPoints = (matched.loyaltyPoints || 0) + Math.floor(totalSpent / 10);
        }
    }

    const taxRate = parseFloat(state.settings.taxRate) || 0;
    const subtotal = state.cart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const discVal = parseFloat(document.getElementById("cart-discount-input")?.value) || 0;
    const discType = document.getElementById("cart-discount-type")?.value || "percent";
    const discAmount = discType === "percent" ? (subtotal * (discVal / 100)) : discVal;
    const taxable = Math.max(0, subtotal - discAmount);
    const taxAmount = taxable * (taxRate / 100);
    const grandTotal = taxable + taxAmount;

    const costTotal = state.cart.reduce((sum, item) => sum + (item.costPrice * item.qty), 0);
    const profit = grandTotal - costTotal;

    let nextNum = 1;
    if (state.transactions && state.transactions.length > 0) {
        const ids = state.transactions.map(t => {
            const match = t.id.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 0;
        });
        nextNum = Math.max(...ids) + 1;
    }
    const receiptId = `TX-${nextNum.toString().padStart(4, '0')}`;
    
    const newTransaction = {
        id: receiptId,
        timestamp: new Date().toISOString(),
        customer: { name: customerObj.name, phone: customerObj.phone || "" },
        paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value || "cash",
        subtotal: subtotal,
        discountPercent: discType === "percent" ? discVal : 0,
        discountAmount: discAmount,
        taxPercent: taxRate,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        profit: profit,
        items: [...state.cart]
    };

    state.cart.forEach(item => {
        const prod = state.products.find(p => p.id === item.id);
        if (prod) {
            if (prod.isBundle && prod.bundleItems) {
                prod.bundleItems.forEach(bItem => {
                    const compProd = state.products.find(p => p.id === bItem.id);
                    if (compProd) {
                        compProd.stock = Math.max(0, compProd.stock - (bItem.qty * item.qty));
                        if (compProd.stock === 0) {
                            triggerNotification("danger", "Stock Depleted", `${compProd.name} has sold out.`);
                        } else if (compProd.stock <= state.settings.lowStockLimit) {
                            triggerNotification("warning", "Low Stock Alert", `${compProd.name} has reached critical level (${compProd.stock} left).`);
                        }
                    }
                });
            } else {
                prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
                if (getProductStock(prod) === 0) {
                    triggerNotification("danger", "Stock Depleted", `${prod.name} has sold out.`);
                } else if (getProductStock(prod) <= state.settings.lowStockLimit) {
                    triggerNotification("warning", "Low Stock Alert", `${prod.name} has reached critical level (${getProductStock(prod)} left).`);
                }
            }
        }
    });

    state.transactions.unshift(newTransaction);
    state.cart = [];
    if (document.getElementById("cart-discount-input")) {
        document.getElementById("cart-discount-input").value = 0;
    }
    
    saveStateToServer();
    refreshAllViews();
    viewReceipt(receiptId);
}

// --------------------------------------------------------------------------
// 7. WHOLESALE POS TERMINAL ENGINE (B2B TIER CODES)
// --------------------------------------------------------------------------
let activeWholesaleCategoryFilter = "all";

function setupWholesalePOSEvents() {
    document.getElementById("w-pos-search")?.addEventListener("input", renderWholesalePOSCatalog);
    document.getElementById("btn-w-clear-cart")?.addEventListener("click", () => {
        state.wholesaleCart = [];
        renderWholesaleCartUI();
    });
    
    document.getElementById("w-cart-discount-input")?.addEventListener("input", renderWholesaleCartUI);
    document.getElementById("w-cart-discount-type")?.addEventListener("change", renderWholesaleCartUI);
    document.getElementById("btn-w-add-customer-pos")?.addEventListener("click", () => {
        openCustomerModal();
    });

    document.getElementById("w-cart-customer-select")?.addEventListener("change", updateB2BCreditDisplay);
    document.getElementById("w-cart-customer-search")?.addEventListener("input", renderWholesaleCartUI);
    document.getElementById("w-cart-salesman-select")?.addEventListener("change", renderWholesaleCartUI);

    document.querySelectorAll('input[name="w-payment-method"]').forEach(r => {
        r.addEventListener("change", (e) => {
            const wCashCreditDetails = document.getElementById("w-cash-credit-details");
            if (e.target.value === "cash-credit") {
                if (wCashCreditDetails) wCashCreditDetails.style.display = "block";
            } else {
                if (wCashCreditDetails) wCashCreditDetails.style.display = "none";
            }
        });
    });

    document.getElementById("btn-w-checkout-pay")?.addEventListener("click", processWholesaleCheckout);
    
    document.getElementById("btn-w-hold-sale")?.addEventListener("click", () => {
        if (state.wholesaleCart.length === 0) {
            alert("Wholesale cart is empty!");
            return;
        }
        triggerNotification("info", "Wholesale Sale On Hold", `Wholesale order with ${state.wholesaleCart.length} bulk packs put on hold.`);
        state.wholesaleCart = [];
        renderWholesaleCartUI();
    });

    // Wire payment method visual toggle
    const wPaymentRadios = document.querySelectorAll('input[name="w-payment-method"]');
    wPaymentRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.querySelectorAll('.cart-payment-methods .payment-option').forEach(opt => {
                opt.classList.remove('checked');
            });
            e.target.closest('.payment-option').classList.add('checked');
        });
    });
}

function renderWholesalePOSCatalog() {
    const grid = document.getElementById("w-pos-catalog-grid");
    const pillsContainer = document.getElementById("w-pos-categories");
    if (!grid) return;

    const categories = ["all", ...new Set(state.products.map(p => p.category))];
    
    pillsContainer.innerHTML = categories.map(cat => {
        const title = cat === "all" ? "All Items" : cat;
        const activeClass = activeWholesaleCategoryFilter === cat ? "active" : "";
        return `<button class="pill ${activeClass}" data-w-category="${cat}">${title}</button>`;
    }).join('');

    pillsContainer.querySelectorAll(".pill").forEach(pill => {
        pill.addEventListener("click", () => {
            activeWholesaleCategoryFilter = pill.getAttribute("data-w-category");
            renderWholesalePOSCatalog();
        });
    });

    const searchQuery = document.getElementById("w-pos-search")?.value.toLowerCase() || "";
    
    let filteredList = state.products;

    if (activeWholesaleCategoryFilter !== "all") {
        filteredList = filteredList.filter(p => p.category === activeWholesaleCategoryFilter);
    }

    if (searchQuery.length > 0) {
        filteredList = filteredList.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            (p.sku && p.sku.toLowerCase().includes(searchQuery))
        );
    }

    if (filteredList.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart-state" style="grid-column: 1/-1; padding: 60px;">
                <i class="fa-solid fa-box-open"></i>
                <p>No wholesale items found</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredList.map(p => {
        const fallbackImg = PRESET_IMAGES[p.category] || PRESET_IMAGES.Default;
        const prodImg = p.img && p.img.trim().startsWith("http") ? p.img : fallbackImg;
        
        let stockTag = `<span class="stock-tag">${getProductStock(p)} In Stock</span>`;
        if (getProductStock(p) === 0) {
            stockTag = `<span class="stock-tag out-tag">OUT OF STOCK</span>`;
        } else if (getProductStock(p) < 1) {
            stockTag = `<span class="stock-tag low-tag">Low Stock (${getProductStock(p)} left)</span>`;
        }

        const wholesalePrice = p.wholesalePrice || p.sellingPrice * 0.8;
        const pkgUnit = p.pkgUnit || "1 Liter";

        return `
            <div class="product-card border-wholesale" onclick="addProductToWholesaleCart('${p.id}')" style="min-height: 160px; padding-top: 35px; padding-bottom: 5px; position: relative;">
                ${stockTag}
                <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                    <span class="w-card-pkg-tag" style="background: rgba(139, 92, 246, 0.2); color: var(--purple-500); padding: 3px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">${pkgUnit}</span>
                </div>
                <div class="prod-card-details">
                    <span class="prod-card-category" style="color:var(--purple-500);">${p.category}</span>
                    <span class="prod-card-title">${p.name}</span>
                    <div class="prod-card-bottom">
                        <span class="prod-card-price" style="color:var(--purple-500);">${state.settings.currency}${wholesalePrice.toFixed(2)}</span>
                        <div class="prod-card-add-btn" style="background-color: var(--purple-500); color:white;">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addProductToWholesaleCart(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    if (getProductStock(prod) < 1) {
        alert(`Product is out of stock!`);
        return;
    }

    const wholesalePrice = prod.wholesalePrice || prod.sellingPrice * 0.8;
    const cartIdx = state.wholesaleCart.findIndex(item => item.id === productId);

    if (cartIdx > -1) {
        const item = state.wholesaleCart[cartIdx];
        const nextQty = item.qty + 1; // increment by 1
        if (nextQty > getProductStock(prod)) {
            alert(`Only ${getProductStock(prod)} units are in stock! Cannot purchase more.`);
            return;
        }
        item.qty = nextQty;
    } else {
        // Add one unit
        state.wholesaleCart.push({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            qty: 1,
            sellingPrice: wholesalePrice,
            costPrice: prod.costPrice,
            pkgUnit: prod.pkgUnit || "1 Liter"
        });
    }

    renderWholesaleCartUI();
}

function updateWholesaleCartQty(idx, increment) {
    const item = state.wholesaleCart[idx];
    if (!item) return;

    const prod = state.products.find(p => p.id === item.id);
    if (!prod) return;

    const step = 1;

    if (increment > 0) {
        const nextQty = item.qty + step;
        if (nextQty > getProductStock(prod)) {
            alert(`Only ${getProductStock(prod)} units are in stock!`);
            return;
        }
        item.qty = nextQty;
    } else {
        item.qty -= step;
        if (item.qty <= 0) {
            state.wholesaleCart.splice(idx, 1);
        }
    }
    renderWholesaleCartUI();
}

window.setWholesaleCartQty = function(idx, val) {
    const item = state.wholesaleCart[idx];
    if (!item) return;
    const prod = state.products.find(p => p.id === item.id);
    let qty = parseFloat(val);
    if (isNaN(qty) || qty <= 0) qty = 1;
    if (prod && qty > getProductStock(prod)) {
        alert(`Only ${getProductStock(prod)} units are in stock!`);
        qty = getProductStock(prod);
    }
    item.qty = qty;
    renderWholesaleCartUI();
};

function removeWholesaleCartItem(idx) {
    state.wholesaleCart.splice(idx, 1);
    renderWholesaleCartUI();
}

function renderWholesaleCartUI() {
    const cartList = document.getElementById("w-cart-items-list");
    const subtotalEl = document.getElementById("w-cart-subtotal");
    const discAmountEl = document.getElementById("w-cart-discount-value");
    const taxEl = document.getElementById("w-cart-tax-value");
    const totalEl = document.getElementById("w-cart-total");
    const countEl = document.getElementById("w-cart-item-count");
    
    if (!cartList) return;

    const taxRate = parseFloat(state.settings.taxRate) || 0;
    document.getElementById("w-cart-tax-rate").innerText = taxRate;

    // Populate all B2B customers in Wholesale POS select dropdown (Credit & Cash) filtered by search and salesman
    const select = document.getElementById("w-cart-customer-select");
    const searchVal = document.getElementById("w-cart-customer-search")?.value.toLowerCase().trim() || "";
    const salesmanSelect = document.getElementById("w-cart-salesman-select");
    const salesmanVal = salesmanSelect ? salesmanSelect.value : null;

    if (select) {
        const currentVal = select.value;
        let filteredCustomers = state.customers;
        
        if (salesmanVal) {
            filteredCustomers = filteredCustomers.filter(c => c.salesman === salesmanVal);
        }

        if (searchVal.length > 0) {
            filteredCustomers = filteredCustomers.filter(c => 
                c.name.toLowerCase().includes(searchVal) || 
                (c.companyName && c.companyName.toLowerCase().includes(searchVal)) ||
                c.phone.includes(searchVal) ||
                (c.address && c.address.toLowerCase().includes(searchVal))
            );
        }
        select.innerHTML = filteredCustomers.map(c => {
            const accType = c.creditLimit > 0 ? "Credit" : "Cash";
            return `<option value="${c.id}">${c.companyName || c.name} [${accType}] (${c.phone})</option>`;
        }).join('');
        
        if (filteredCustomers.some(c => c.id === currentVal)) {
            select.value = currentVal;
        } else if (filteredCustomers.length > 0) {
            select.value = filteredCustomers[0].id;
        }
    }

    updateB2BCreditDisplay();

    if (state.wholesaleCart.length === 0) {
        cartList.innerHTML = `
            <div class="empty-cart-state">
                <i class="fa-solid fa-truck-flatbed"></i>
                <p>Wholesale cart is empty</p>
                <span>Select bulk product boxes on the left. MOQ guidelines apply.</span>
            </div>
        `;
        subtotalEl.innerText = `${state.settings.currency}0.00`;
        discAmountEl.innerText = `-${state.settings.currency}0.00`;
        taxEl.innerText = `${state.settings.currency}0.00`;
        totalEl.innerText = `${state.settings.currency}0.00`;
        countEl.innerText = "0 packs";
        return;
    }

    // Math summaries
    const totalPacks = state.wholesaleCart.reduce((sum, item) => sum + item.qty, 0);
    countEl.innerText = `${totalPacks} items`;

    cartList.innerHTML = state.wholesaleCart.map((item, idx) => `
        <div class="cart-item border-wholesale">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price" style="color:var(--purple-500);">${state.settings.currency}${(item.sellingPrice * item.qty).toFixed(2)}</span>
                <span style="font-size:0.65rem; color:var(--text-muted);">${item.pkgUnit} (${item.qty} units total)</span>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateWholesaleCartQty(${idx}, -1)"><i class="fa-solid fa-minus"></i></button>
                <input type="number" class="qty-val" value="${item.qty}" min="0.01" step="any" onchange="setWholesaleCartQty(${idx}, this.value)" style="width: 45px; font-size:0.75rem; text-align:center; border:1px solid var(--border-color); background:transparent; color:var(--text-main); border-radius:4px; outline:none; -moz-appearance:textfield;">
                <button class="qty-btn" onclick="updateWholesaleCartQty(${idx}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="cart-item-remove" onclick="removeWholesaleCartItem(${idx})"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');

    const subtotal = state.wholesaleCart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const discVal = parseFloat(document.getElementById("w-cart-discount-input")?.value) || 0;
    const discType = document.getElementById("w-cart-discount-type")?.value || "percent";
    const discAmount = discType === "percent" ? (subtotal * (discVal / 100)) : discVal;
    const taxableTotal = Math.max(0, subtotal - discAmount);
    const taxAmount = taxableTotal * (taxRate / 100);
    const grandTotal = taxableTotal + taxAmount;

    subtotalEl.innerText = `${state.settings.currency}${subtotal.toFixed(2)}`;
    discAmountEl.innerText = `-${state.settings.currency}${discAmount.toFixed(2)}`;
    taxEl.innerText = `${state.settings.currency}${taxAmount.toFixed(2)}`;
    totalEl.innerText = `${state.settings.currency}${grandTotal.toFixed(2)}`;
}

function updateB2BCreditDisplay() {
    const badge = document.getElementById("w-customer-credit-badge");
    const select = document.getElementById("w-cart-customer-select");
    if (!badge || !select) return;

    const cust = state.customers.find(c => c.id === select.value);
    if (cust) {
        if (cust.creditLimit > 0) {
            const available = cust.creditLimit - (cust.outstandingDebt || 0);
            badge.innerHTML = `<span style="color: var(--success); font-weight:600;"><i class="fa-solid fa-credit-card"></i> Credit Account: <strong>${cust.companyName || cust.name}</strong> | Credit: <strong>${state.settings.currency}${available.toFixed(2)}</strong> available (Limit: ${state.settings.currency}${cust.creditLimit.toFixed(2)})</span>`;
        } else {
            badge.innerHTML = `<span style="color: var(--amber-500); font-weight:600;"><i class="fa-solid fa-wallet"></i> Cash Account: <strong>${cust.companyName || cust.name}</strong> | <strong>Direct Settlement Only</strong> (No Credit Allowed)</span>`;
        }
    } else {
        badge.innerHTML = `<span>Select customer for wholesale transaction.</span>`;
    }
}

// B2B CREDIT CHECKOUT ENGINE
function processWholesaleCheckout() {
    if (state.wholesaleCart.length === 0) {
        alert("The wholesale cart is empty!");
        return;
    }

    const select = document.getElementById("w-cart-customer-select");
    const customerId = select?.value;
    const cust = state.customers.find(c => c.id === customerId);

    if (!cust) {
        alert("Please select a valid customer to complete wholesale billing!");
        return;
    }

    const billingType = document.querySelector('input[name="w-payment-method"]:checked')?.value || "credit";

    // Validate Credit accounts
    if (billingType === "credit" && !cust.isWholesale) {
        alert(`CRITICAL ERROR: "${cust.name}" is a retail customer and does not have a Wholesale Store Credit Account! Please choose Cash/Bank Wire payment method or enable B2B Wholesale status on this customer's profile.`);
        return;
    }

    const salesmanSelect = document.getElementById("w-cart-salesman-select");
    const selectedSalesman = salesmanSelect ? salesmanSelect.value : "Shemal";

    // 1. Math aggregates
    const taxRate = parseFloat(state.settings.taxRate) || 0;
    const subtotal = state.wholesaleCart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const discVal = parseFloat(document.getElementById("w-cart-discount-input")?.value) || 0;
    const discType = document.getElementById("w-cart-discount-type")?.value || "percent";
    const discAmount = discType === "percent" ? (subtotal * (discVal / 100)) : discVal;
    const taxable = Math.max(0, subtotal - discAmount);
    const taxAmount = taxable * (taxRate / 100);
    const grandTotal = taxable + taxAmount;

    const costTotal = state.wholesaleCart.reduce((sum, item) => sum + (item.costPrice * item.qty), 0);
    const profit = grandTotal - costTotal;

    // 2. Validate Credit limits
    let amountPaid = 0.00;
    let debtAdded = 0.00;

    if (billingType === "credit") {
        const available = cust.creditLimit - (cust.outstandingDebt || 0);
        if (grandTotal > available) {
            alert(`CRITICAL WARNING: This B2B invoice total (${state.settings.currency}${grandTotal.toFixed(2)}) exceeds the corporate client's remaining available credit line (${state.settings.currency}${available.toFixed(2)})! Checkout blocked.`);
            return;
        }
        debtAdded = grandTotal;
        amountPaid = 0.00; 
    } else if (billingType === "cash-credit") {
        const upfront = parseFloat(document.getElementById("w-upfront-payment").value) || 0;
        if (upfront < 0 || upfront > grandTotal) {
            alert("Invalid upfront payment amount! Must be between 0 and the Grand Total.");
            return;
        }
        debtAdded = grandTotal - upfront;
        amountPaid = upfront;
        
        const available = cust.creditLimit - (cust.outstandingDebt || 0);
        if (debtAdded > available && !cust.isWholesale) {
            alert(`CRITICAL WARNING: This customer does not have enough credit line for the remaining balance.`);
            return;
        }
    } else {
        amountPaid = grandTotal; 
        debtAdded = 0.00;
    }

    // 3. Deduct stock and trigger warnings
    state.wholesaleCart.forEach(item => {
        const prod = state.products.find(p => p.id === item.id);
        if (prod) {
            if (prod.isBundle && prod.bundleItems) {
                prod.bundleItems.forEach(bItem => {
                    const compProd = state.products.find(p => p.id === bItem.id);
                    if (compProd) {
                        compProd.stock = Math.max(0, compProd.stock - (bItem.qty * item.qty));
                        if (compProd.stock === 0) {
                            triggerNotification("danger", "Stock Depleted", `${compProd.name} has sold out (Wholesale purchase).`);
                        } else if (compProd.stock <= state.settings.lowStockLimit) {
                            triggerNotification("warning", "Low Stock Alert", `${compProd.name} has dropped below limit (${compProd.stock} remaining).`);
                        }
                    }
                });
            } else {
                prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
                if (getProductStock(prod) === 0) {
                    triggerNotification("danger", "Stock Depleted", `${prod.name} has sold out (Wholesale purchase).`);
                } else if (getProductStock(prod) <= state.settings.lowStockLimit) {
                    triggerNotification("warning", "Low Stock Alert", `${prod.name} has dropped below limit (${getProductStock(prod)} remaining).`);
                }
            }
        }
    });

    // 4. Update customer outstanding debt
    cust.outstandingDebt = (cust.outstandingDebt || 0) + debtAdded;
    cust.purchaseCount = (cust.purchaseCount || 0) + 1;

    // 5. Save B2B Invoice to Wholesale Ledgers
    let nextNum = 1200;
    if (state.wholesaleTransactions.length > 0) {
        const ids = state.wholesaleTransactions.map(t => {
            const match = t.id.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 0;
        });
        const maxId = Math.max(...ids);
        if (maxId >= 1200) {
            nextNum = maxId + 1;
        }
    }
    const wInvoiceId = "W-INV-" + nextNum;
    
    const newInvoice = {
        id: wInvoiceId,
        timestamp: new Date().toISOString(),
        customer: { id: cust.id, name: cust.name, companyName: cust.companyName, phone: cust.phone },
        salesman: selectedSalesman,
        paymentMethod: billingType === "credit" ? "store-credit" : billingType,
        subtotal: subtotal,
        discountPercent: discType === "percent" ? discVal : 0,
        discountAmount: discAmount,
        taxPercent: taxRate,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        amountPaid: amountPaid,
        outstandingBalance: debtAdded,
        profit: profit,
        billingTerms: billingType === "credit" ? "Net 30 Account" : "Direct Settlement",
        status: billingType === "credit" ? "unpaid" : "paid",
        items: [...state.wholesaleCart],
        paymentHistory: amountPaid > 0 ? [{
            date: new Date().toISOString(),
            amount: amountPaid,
            method: billingType === "cash-credit" ? "cash-credit-upfront" : billingType
        }] : []
    };

    state.wholesaleTransactions.unshift(newInvoice);
    state.wholesaleCart = [];
    if (document.getElementById("w-cart-discount-input")) {
        document.getElementById("w-cart-discount-input").value = 0;
    }

    saveStateToServer();
    refreshAllViews();
    
    // Popup high-fidelity invoice receipt or redirect to cash-credit tab
    if (billingType === "cash-credit") {
        switchTab("cash-credit");
        // Optionally still show receipt? The user specifically asked to go to the cash credit page.
        triggerNotification("success", "Invoice Created", "Wholesale invoice with upfront cash logged.");
    } else {
        viewWholesaleReceipt(wInvoiceId);
    }
}

function viewWholesaleReceipt(invoiceId) {
    const tx = state.wholesaleTransactions.find(t => t.id === invoiceId);
    if (!tx) return;

    const modal = document.getElementById("modal-receipt");
    const container = document.getElementById("receipt-invoice-printout");
    if (!modal || !container) return;

    // Formatting date
    const dateObj = new Date(tx.timestamp);
    const dateStr = dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy

    // Splitting value into Rs and Cts
    const splitMoney = (amount) => {
        const parts = amount.toFixed(2).split('.');
        return { rs: parts[0], cts: parts[1] };
    };

    let itemsRows = '';
    for (let i = 0; i < tx.items.length; i++) {
        const item = tx.items[i];
        const rowTotal = item.qty * item.sellingPrice;
        const tSplit = splitMoney(rowTotal);
        itemsRows += `
            <tr>
                <td>${item.sku || '-'}</td>
                <td>${item.name}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right;">${item.sellingPrice.toFixed(2)}</td>
                <td></td> <!-- Free -->
                <td></td> <!-- Dis % -->
                <td style="text-align:right; border-right:1px solid #000;">${tSplit.rs}</td>
                <td style="text-align:right;">${tSplit.cts}</td>
            </tr>
        `;
    }

    const gSplit = splitMoney(tx.grandTotal);
    const pSplit = splitMoney(tx.amountPaid || 0);
    const bSplit = splitMoney(tx.outstandingBalance || 0);

    const fullCustomer = state.customers.find(c => c.id === tx.customer?.id) || tx.customer;

    container.innerHTML = `
        <div class="a4-invoice-wrapper">
            <!-- Header -->
            <div class="inv-header">
                <div class="inv-logo-left">
                    <img src="imagesB.jpg" alt="Browns Logo" style="max-width: 140px; max-height: 80px; object-fit: contain;">
                </div>
                <div class="inv-header-center">
                    <h1 class="inv-company-title">BROWNS & COMPANY PLC</h1>
                    <h2 class="inv-subtitle">Thriller Motors (Pvt)Ltd</h2>
                    <h3 class="inv-address">Aluthgama, Bogamuwa, Kalagedihena</h3>
                    <h3 class="inv-contact">Mobile No. 0773427057 /0766275271</h3>
                </div>
                <div class="inv-logo-right">
                    <img src="imagesG.png" alt="Gulf Logo" style="max-width: 100px; max-height: 100px; object-fit: contain;">
                </div>
            </div>

            <hr class="inv-divider-top">

            <!-- Customer Details -->
            <div class="inv-details">
                <div class="inv-details-left">
                    <div class="detail-row">
                        <span class="detail-label">Name of Customer ;</span>
                        <span class="detail-value" style="font-weight:bold;">${fullCustomer?.companyName || fullCustomer?.name || "Guest Customer"}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Address ;</span>
                        <span class="detail-value">${fullCustomer?.address || "..................................................."}</span>
                    </div>
                </div>
                <div class="inv-details-right">
                    <div class="detail-row">
                        <span class="detail-label">Invoice No ;</span>
                        <span class="detail-value" style="font-weight:bold; padding-left:10px;">${tx.id.replace('W-INV-', '')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Customer Code ;</span>
                        <span class="detail-value" style="padding-left:10px;">${tx.customer?.id || ""}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date ;</span>
                        <span class="detail-value" style="padding-left:10px;">${dateStr}.</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="inv-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:14%;">Product Code</th>
                        <th rowspan="2" style="width:40%;">Product Description</th>
                        <th rowspan="2" style="width:6%;">Qty</th>
                        <th rowspan="2" style="width:12%;">Unit Price</th>
                        <th colspan="2" style="width:12%;">Offers</th>
                        <th colspan="2" style="width:16%;">Amount</th>
                    </tr>
                    <tr>
                        <th style="width:6%;">Free</th>
                        <th style="width:6%;">Dis %</th>
                        <th style="width:10%; border-right:1px solid #000;">Rs</th>
                        <th style="width:6%;">Cts.</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr class="inv-total-row">
                        <td colspan="6" style="text-align:left; font-weight:bold;">Total</td>
                        <td style="text-align:right; font-weight:bold; border-right:1px solid #000;">${gSplit.rs}</td>
                        <td style="text-align:right; font-weight:bold;">${gSplit.cts}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Footer Signatures -->
            <div class="inv-footer-sigs">
                <div class="sig-box">
                    <div class="sig-line">........................................</div>
                    <div class="sig-title">Signature<br>Sales Representative (Mr. ${tx.salesman || "Shemal"})</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">........................................</div>
                    <div class="sig-title">Customer Signature<br>(With Rubber Stamp)</div>
                </div>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById("btn-close-receipt-modal");
    const closeFtr = document.getElementById("btn-close-receipt-footer");
    const printBtn = document.getElementById("btn-print-receipt");
    const downloadBtn = document.getElementById("btn-download-pdf");

    const dismissModal = () => modal.classList.remove("active");
    if(closeBtn) closeBtn.onclick = dismissModal;
    if(closeFtr) closeFtr.onclick = dismissModal;
    if(printBtn) printBtn.onclick = () => window.print();
    if(downloadBtn) {
        downloadBtn.onclick = () => {
            const element = document.getElementById("receipt-invoice-printout");
            
            // Temporarily remove max-height and overflow to prevent PDF truncation
            element.style.maxHeight = 'none';
            element.style.overflow = 'visible';

            const opt = {
                margin:       0.2,
                filename:     `Wholesale_Invoice_${tx.id}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Restore CSS after generating
                element.style.maxHeight = '';
                element.style.overflow = '';
            });
        };
    }

    modal.classList.add("active");
}

// --------------------------------------------------------------------------
// 8. WHOLESALE LEDGER (B2B CREDIT AR RECOVERY)
// --------------------------------------------------------------------------
function setupWholesaleLedgerEvents() {
    document.getElementById("w-ledger-search")?.addEventListener("input", renderWholesaleLedger);
    document.getElementById("w-ledger-filter-status")?.addEventListener("change", renderWholesaleLedger);
    document.getElementById("w-ledger-filter-salesman")?.addEventListener("change", renderWholesaleLedger);
    
    document.getElementById("btn-w-ledger-reset")?.addEventListener("click", () => {
        document.getElementById("w-ledger-search").value = "";
        document.getElementById("w-ledger-filter-status").value = "all";
        const smSelect = document.getElementById("w-ledger-filter-salesman");
        if (smSelect) smSelect.value = "all";
        renderWholesaleLedger();
    });

    // Settle Modal Dismiss triggers
    document.getElementById("btn-close-debt-modal")?.addEventListener("click", closeDebtModal);
    document.getElementById("btn-cancel-debt-modal")?.addEventListener("click", closeDebtModal);

    const form = document.getElementById("debt-payment-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            processDebtRepayment();
        });
    }

    const payMethodSelect = document.getElementById("debt-payment-method");
    const chequeFields = document.getElementById("debt-cheque-fields");
    if (payMethodSelect && chequeFields) {
        payMethodSelect.addEventListener("change", () => {
            if (payMethodSelect.value === "cheque") {
                chequeFields.style.display = "block";
                document.getElementById("debt-cheque-number").setAttribute("required", "true");
                document.getElementById("debt-cheque-bank").setAttribute("required", "true");
                document.getElementById("debt-cheque-branch").setAttribute("required", "true");
                document.getElementById("debt-cheque-received-date").setAttribute("required", "true");
                document.getElementById("debt-cheque-deposit-date").setAttribute("required", "true");
            } else {
                chequeFields.style.display = "none";
                document.getElementById("debt-cheque-number").removeAttribute("required");
                document.getElementById("debt-cheque-bank").removeAttribute("required");
                document.getElementById("debt-cheque-branch").removeAttribute("required");
                document.getElementById("debt-cheque-received-date").removeAttribute("required");
                document.getElementById("debt-cheque-deposit-date").removeAttribute("required");
            }
        });
    }
}

function renderWholesaleLedger() {
    const tbody = document.getElementById("w-ledger-tbody");
    if (!tbody) return;

    // 1. Calculate Salesman performance dynamically from all wholesale transactions
    let shemalSales = 0, shemalProfit = 0, shemalInvoices = 0;
    let kaveenSales = 0, kaveenProfit = 0, kaveenInvoices = 0;

    state.wholesaleTransactions.forEach(tx => {
        const salesman = tx.salesman || "Shemal";
        if (salesman === "Shemal") {
            shemalSales += tx.grandTotal;
            shemalProfit += tx.profit;
            shemalInvoices++;
        } else if (salesman === "Kaveen") {
            kaveenSales += tx.grandTotal;
            kaveenProfit += tx.profit;
            kaveenInvoices++;
        }
    });

    const shemalSalesEl = document.getElementById("w-stat-shemal-sales");
    const shemalMetaEl = document.getElementById("w-stat-shemal-meta");
    const kaveenSalesEl = document.getElementById("w-stat-kaveen-sales");
    const kaveenMetaEl = document.getElementById("w-stat-kaveen-meta");

    const shemalCustomers = state.customers.filter(c => c.isWholesale && (c.salesman || "Shemal") === "Shemal");
    const kaveenCustomers = state.customers.filter(c => c.isWholesale && c.salesman === "Kaveen");
    const shemalCustCount = shemalCustomers.length;
    const kaveenCustCount = kaveenCustomers.length;

    if (shemalSalesEl) shemalSalesEl.innerText = `${state.settings.currency}${shemalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (shemalMetaEl) shemalMetaEl.innerText = `${shemalInvoices} Invoices | ${shemalCustCount} Customers | ${state.settings.currency}${shemalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Profit`;
    if (kaveenSalesEl) kaveenSalesEl.innerText = `${state.settings.currency}${kaveenSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kaveenMetaEl) kaveenMetaEl.innerText = `${kaveenInvoices} Invoices | ${kaveenCustCount} Customers | ${state.settings.currency}${kaveenProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Profit`;

    // Render Shemal's B2B customers list
    const shemalListEl = document.getElementById("shemal-customers-list");
    const shemalCustBadge = document.getElementById("shemal-cust-badge");
    if (shemalCustBadge) shemalCustBadge.innerText = `${shemalCustCount} Customers`;
    if (shemalListEl) {
        if (shemalCustomers.length === 0) {
            shemalListEl.innerHTML = `<div style="color: var(--text-muted); font-style: italic; font-size: 0.75rem; padding: 4px 0; text-align: center;">No assigned B2B customers</div>`;
        } else {
            shemalListEl.innerHTML = shemalCustomers.map(c => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.15); border-radius: 6px; padding: 6px 10px; margin-bottom: 2px;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.75rem;">${c.companyName || c.name}</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">${c.name} â€¢ ${c.phone || 'No Phone'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: ${c.outstandingDebt > 0 ? '#ef4444' : '#10b981'}; font-size: 0.75rem;">
                            ${state.settings.currency}${c.outstandingDebt.toFixed(2)}
                        </div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">
                            Limit: ${state.settings.currency}${c.creditLimit.toFixed(2)}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Render Kaveen's B2B customers list
    const kaveenListEl = document.getElementById("kaveen-customers-list");
    const kaveenCustBadge = document.getElementById("kaveen-cust-badge");
    if (kaveenCustBadge) kaveenCustBadge.innerText = `${kaveenCustCount} Customers`;
    if (kaveenListEl) {
        if (kaveenCustomers.length === 0) {
            kaveenListEl.innerHTML = `<div style="color: var(--text-muted); font-style: italic; font-size: 0.75rem; padding: 4px 0; text-align: center;">No assigned B2B customers</div>`;
        } else {
            kaveenListEl.innerHTML = kaveenCustomers.map(c => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 6px; padding: 6px 10px; margin-bottom: 2px;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.75rem;">${c.companyName || c.name}</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">${c.name} â€¢ ${c.phone || 'No Phone'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: ${c.outstandingDebt > 0 ? '#ef4444' : '#10b981'}; font-size: 0.75rem;">
                            ${state.settings.currency}${c.outstandingDebt.toFixed(2)}
                        </div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">
                            Limit: ${state.settings.currency}${c.creditLimit.toFixed(2)}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 2. Fetch filters
    const query = document.getElementById("w-ledger-search")?.value.toLowerCase().trim() || "";
    const filterStatus = document.getElementById("w-ledger-filter-status")?.value || "all";
    const filterSalesman = document.getElementById("w-ledger-filter-salesman")?.value || "all";

    let list = state.wholesaleTransactions;

    // Apply status filter
    if (filterStatus === "unpaid") {
        list = list.filter(tx => tx.outstandingBalance > 0);
    } else if (filterStatus === "paid") {
        list = list.filter(tx => tx.outstandingBalance === 0);
    }

    // Apply salesman filter
    if (filterSalesman !== "all") {
        list = list.filter(tx => (tx.salesman || "Shemal") === filterSalesman);
    }

    // Apply text search query
    if (query.length > 0) {
        list = list.filter(tx => 
            tx.id.toLowerCase().includes(query) ||
            tx.customer?.name.toLowerCase().includes(query) ||
            (tx.customer?.companyName && tx.customer.companyName.toLowerCase().includes(query))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px; color:var(--text-muted);"><i class="fa-solid fa-truck-ramp-box" style="font-size:32px; margin-bottom:12px; display:block;"></i>No wholesale corporate invoice balances recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(tx => {
        const datetime = new Date(tx.timestamp).toLocaleString();
        
        let statusBadge = `<span class="badge badge-success">Delivered / Paid</span>`;
        let actionBtn = `<div style="display:flex; flex-direction:column; gap:4px; min-width:80px;">
                            <button class="btn btn-secondary btn-xs" onclick="viewWholesaleReceipt('${tx.id}')"><i class="fa-solid fa-receipt"></i> Receipt</button>
                            <button class="btn btn-danger btn-xs" onclick="cancelWholesaleInvoice('${tx.id}')"><i class="fa-solid fa-ban"></i> Return</button>
                         </div>`;

        if (tx.status === "returned") {
            statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">Returned / Cancelled</span>`;
            actionBtn = `<button class="btn btn-secondary btn-xs" style="width:100%;" onclick="viewWholesaleReceipt('${tx.id}')"><i class="fa-solid fa-receipt"></i> Receipt</button>`;
        } else if (tx.outstandingBalance > 0) {
            statusBadge = `<span class="badge badge-danger">Outstanding credit</span>`;
            actionBtn = `
                <div style="display:flex; flex-direction:column; gap:4px; min-width:80px;">
                    <button class="btn btn-secondary btn-xs" onclick="viewWholesaleReceipt('${tx.id}')"><i class="fa-solid fa-receipt"></i> Receipt</button>
                    <button class="btn btn-primary btn-xs" style="background-color:var(--success);" onclick="openDebtRepaymentModal('${tx.id}')"><i class="fa-solid fa-truck-fast"></i> Delivered</button>
                    <button class="btn btn-danger btn-xs" onclick="cancelWholesaleInvoice('${tx.id}')"><i class="fa-solid fa-ban"></i> Return</button>
                </div>
            `;
        }

        const salesmanName = tx.salesman || "Shemal";
        const salesmanBadge = salesmanName === "Shemal"
            ? `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: var(--purple-500); border: 1px solid rgba(168, 85, 247, 0.3); font-weight:600;">Mr. Shemal</span>`
            : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--amber-500); border: 1px solid rgba(245, 158, 11, 0.3); font-weight:600;">Mr. Kaveen</span>`;

        return `
            <tr>
                <td><strong>${tx.id}</strong></td>
                <td>${datetime}</td>
                <td>
                    <div class="product-info-cell">
                        <span class="product-cell-name">${tx.customer?.companyName || tx.customer?.name}</span>
                        <span class="product-cell-sku">${tx.customer?.name}</span>
                    </div>
                </td>
                <td>${salesmanBadge}</td>
                <td style="font-weight:600;">${state.settings.currency}${tx.grandTotal.toFixed(2)}</td>
                <td style="color:var(--success); font-weight:500;">${state.settings.currency}${tx.amountPaid.toFixed(2)}</td>
                <td style="color:var(--danger); font-weight:700;">${state.settings.currency}${tx.outstandingBalance.toFixed(2)}</td>
                <td><span class="badge badge-secondary">${tx.billingTerms}</span></td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

// B2B AR COLLECT DEBT OVERLAY
function openDebtRepaymentModal(invoiceId) {
    const tx = state.wholesaleTransactions.find(t => t.id === invoiceId);
    if (!tx) return;

    const modal = document.getElementById("modal-debt-payment");
    if (!modal) return;

    document.getElementById("debt-tx-id-field").value = tx.id;
    document.getElementById("debt-company-name").value = tx.customer?.companyName || tx.customer?.name;
    document.getElementById("debt-grand-total").value = `${state.settings.currency}${tx.grandTotal.toFixed(2)}`;
    document.getElementById("debt-remaining-balance").value = `${state.settings.currency}${tx.outstandingBalance.toFixed(2)}`;
    
    // Suggest complete payment in help text
    document.getElementById("debt-collect-amount").value = "";
    document.getElementById("debt-collect-amount").max = tx.outstandingBalance;

    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById("debt-payment-date");
    if(dateInput) dateInput.value = todayStr;

    // Reset payment method and cheque fields
    const methodSelect = document.getElementById("debt-payment-method");
    if (methodSelect) {
        methodSelect.value = "cash";
    }
    const chequeFields = document.getElementById("debt-cheque-fields");
    if (chequeFields) {
        chequeFields.style.display = "none";
        
        // Clear all inputs
        document.getElementById("debt-cheque-number").value = "";
        document.getElementById("debt-cheque-bank").value = "";
        document.getElementById("debt-cheque-branch").value = "";
        document.getElementById("debt-cheque-received-date").value = "";
        document.getElementById("debt-cheque-deposit-date").value = "";
        document.getElementById("debt-cheque-emergency-date").value = "";

        // Remove required attributes
        document.getElementById("debt-cheque-number").removeAttribute("required");
        document.getElementById("debt-cheque-bank").removeAttribute("required");
        document.getElementById("debt-cheque-branch").removeAttribute("required");
        document.getElementById("debt-cheque-received-date").removeAttribute("required");
        document.getElementById("debt-cheque-deposit-date").removeAttribute("required");
    }

    modal.classList.add("active");
}

function closeDebtModal() {
    const modal = document.getElementById("modal-debt-payment");
    if (modal) modal.classList.remove("active");
}

function processDebtRepayment() {
    const invoiceId = document.getElementById("debt-tx-id-field").value;
    const collectAmount = parseFloat(document.getElementById("debt-collect-amount").value) || 0;

    const tx = state.wholesaleTransactions.find(t => t.id === invoiceId);
    if (!tx) return;

    if (collectAmount <= 0 || collectAmount > tx.outstandingBalance) {
        alert("Invalid payment collection amount!");
        return;
    }

    const paymentMethod = document.getElementById("debt-payment-method")?.value || "cash";

    if (paymentMethod === "cheque") {
        const chqNum = document.getElementById("debt-cheque-number").value.trim();
        const chqBank = document.getElementById("debt-cheque-bank").value.trim();
        const chqBranch = document.getElementById("debt-cheque-branch").value.trim();
        const chqRecDate = document.getElementById("debt-cheque-received-date").value;
        const chqDepDate = document.getElementById("debt-cheque-deposit-date").value;
        const chqEmergDate = document.getElementById("debt-cheque-emergency-date").value || null;

        if (!chqNum || !chqBank || !chqBranch || !chqRecDate || !chqDepDate) {
            alert("Please fill in all required cheque details!");
            return;
        }

        // Prevent duplicate cheque numbers
        const existingCheque = state.cheques.find(c => c.chequeNumber === chqNum);
        if (existingCheque) {
            alert("This cheque number has already been added to the system!");
            return;
        }

        // Log the cheque
        const newCheque = {
            id: "CHQ-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            chequeNumber: chqNum,
            bankName: chqBank,
            branchName: chqBranch,
            receivedDate: chqRecDate,
            depositDate: chqDepDate,
            emergencyRequestDate: chqEmergDate,
            amount: collectAmount,
            status: chqEmergDate ? "postponed" : "pending",
            customer: {
                id: tx.customer.id,
                name: tx.customer.name,
                companyName: tx.customer.companyName || tx.customer.name
            },
            invoiceId: tx.id,
            salesman: tx.salesman || "Shemal"
        };
        state.cheques.push(newCheque);
    }

    // 1. Deduct outstanding balance in invoice ledger
    tx.outstandingBalance = Math.max(0, tx.outstandingBalance - collectAmount);
    tx.amountPaid += collectAmount;
    
    tx.paymentHistory = tx.paymentHistory || [];
    const paymentDate = document.getElementById("debt-payment-date")?.value || new Date().toISOString();
    tx.paymentHistory.push({
        date: paymentDate,
        amount: collectAmount,
        method: paymentMethod
    });

    if (tx.outstandingBalance === 0) {
        tx.status = "paid";
    }

    // 2. Reduce Customer outstanding debt profile
    const cust = state.customers.find(c => c.id === tx.customer.id);
    if (cust) {
        cust.outstandingDebt = Math.max(0, (cust.outstandingDebt || 0) - collectAmount);
    }

    saveStateToServer();
    closeDebtModal();
    refreshAllViews();

    if (paymentMethod === "cheque") {
        const chqNum = document.getElementById("debt-cheque-number").value.trim();
        triggerNotification("success", "Cheque Received", `Cheque ${chqNum} for ${state.settings.currency}${collectAmount.toFixed(2)} logged for ${tx.customer.companyName || tx.customer.name}.`);
        alert("Cheque received and logged successfully! Invoice outstanding balance updated.");
    } else {
        triggerNotification("success", "Credit Payment Collected", `Collected ${state.settings.currency}${collectAmount.toFixed(2)} from ${tx.customer.companyName || tx.customer.name} via ${paymentMethod.toUpperCase()}.`);
        alert("Wholesale invoice payment collected successfully!");
    }

    if (paymentMethod === "cash-credit") {
        switchTab("cash-credit");
    }
}

// --------------------------------------------------------------------------
// 9. Inventory Management Controller
// --------------------------------------------------------------------------
let inventorySearchQuery = "";
let inventoryCategoryFilter = "all";
let inventoryStockFilter = "all";

function setupProductInventoryEvents() {
    const addBtn = document.getElementById("btn-add-product");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openProductModal();
        });
    }

    document.getElementById("btn-close-product-modal")?.addEventListener("click", closeProductModal);
    document.getElementById("btn-cancel-product-modal")?.addEventListener("click", closeProductModal);


    const form = document.getElementById("product-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveProductForm();
        });
    }

    document.getElementById("inventory-search")?.addEventListener("input", (e) => {
        inventorySearchQuery = e.target.value.toLowerCase().trim();
        state.inventoryPage = 1;
        renderInventory();
    });
    
    document.getElementById("inventory-filter-category")?.addEventListener("change", (e) => {
        inventoryCategoryFilter = e.target.value;
        state.inventoryPage = 1;
        renderInventory();
    });

    document.getElementById("inventory-filter-stock")?.addEventListener("change", (e) => {
        inventoryStockFilter = e.target.value;
        state.inventoryPage = 1;
        renderInventory();
    });

    document.getElementById("btn-reset-inventory-filters")?.addEventListener("click", () => {
        document.getElementById("inventory-search").value = "";
        document.getElementById("inventory-filter-category").value = "all";
        document.getElementById("inventory-filter-stock").value = "all";
        inventorySearchQuery = "";
        inventoryCategoryFilter = "all";
        inventoryStockFilter = "all";
        state.inventoryPage = 1;
        renderInventory();
    });

    // Pagination
    document.getElementById("btn-prev-page")?.addEventListener("click", () => {
        if (state.inventoryPage > 1) {
            state.inventoryPage--;
            renderInventory();
        }
    });
    document.getElementById("btn-next-page")?.addEventListener("click", () => {
        const totalItems = getFilteredProducts().length;
        const totalPages = Math.ceil(totalItems / state.inventoryPageSize);
        if (state.inventoryPage < totalPages) {
            state.inventoryPage++;
            renderInventory();
        }
    });
}

function getFilteredProducts() {
    let list = state.products;

    if (inventoryCategoryFilter !== "all") {
        list = list.filter(p => p.category === inventoryCategoryFilter);
    }

    if (inventoryStockFilter === "low") {
        list = list.filter(p => getProductStock(p) > 0 && getProductStock(p) <= state.settings.lowStockLimit);
    } else if (inventoryStockFilter === "out") {
        list = list.filter(p => getProductStock(p) === 0);
    }

    if (inventorySearchQuery.length > 0) {
        list = list.filter(p => 
            p.name.toLowerCase().includes(inventorySearchQuery) || 
            (p.sku && p.sku.toLowerCase().includes(inventorySearchQuery)) ||
            (p.supplier && p.supplier.toLowerCase().includes(inventorySearchQuery))
        );
    }

    return list;
}

function renderInventory() {
    const tbody = document.getElementById("inventory-tbody");
    if (!tbody) return;

    populateInventoryCategoryFilters();

    const filtered = getFilteredProducts();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / state.inventoryPageSize) || 1;
    
    if (state.inventoryPage > totalPages) state.inventoryPage = totalPages;
    
    const start = (state.inventoryPage - 1) * state.inventoryPageSize;
    const paginated = filtered.slice(start, start + state.inventoryPageSize);

    const rangeLabel = totalItems === 0 ? "Showing 0 of 0 items" : `Showing ${start + 1}-${Math.min(start + state.inventoryPageSize, totalItems)} of ${totalItems} items`;
    document.getElementById("inventory-pagination-info").innerText = rangeLabel;
    
    document.getElementById("btn-prev-page").disabled = state.inventoryPage === 1;
    document.getElementById("btn-next-page").disabled = state.inventoryPage === totalPages;

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 40px; color:var(--text-muted);"><i class="fa-solid fa-box-open" style="font-size:32px; margin-bottom:12px; display:block;"></i>No products found.</td></tr>`;
        return;
    }

    tbody.innerHTML = paginated.map(p => {
        let stockBadge = `<span class="badge badge-success">Good Stock</span>`;
        let barClass = "good";
        let stockPercent = Math.min(100, (getProductStock(p) / 25) * 100);
        
        if (getProductStock(p) === 0) {
            stockBadge = `<span class="badge badge-danger">Out of Stock</span>`;
            barClass = "out";
            stockPercent = 0;
        } else if (getProductStock(p) <= state.settings.lowStockLimit) {
            stockBadge = `<span class="badge badge-warning">Low Stock</span>`;
            barClass = "low";
        }

        const fallbackImg = PRESET_IMAGES[p.category] || PRESET_IMAGES.Default;
        const prodImg = p.img && p.img.trim().startsWith("http") ? p.img : fallbackImg;
        
        const wholesalePriceVal = p.wholesalePrice || p.sellingPrice * 0.8;
        const pkgSizeVal = p.pkgUnit || `1 Liter`;

        return `
            <tr>
                <td>
                    <div class="product-info-cell">
                        <span class="product-cell-name">${p.name} ${p.isBundle ? '<span class="badge badge-primary" style="font-size:0.65rem; padding: 2px 5px; margin-left: 5px;">📦 Package</span>' : ''}</span>
                        <span class="product-cell-sku">${p.sku || "N/A"}</span>
                    </div>
                </td>
                <td><span class="badge badge-secondary">${p.category}</span></td>
                <td style="font-weight: 500;">${state.settings.currency}${p.costPrice.toFixed(2)}</td>
                <td style="font-weight: 600; color:var(--primary);">${state.settings.currency}${p.sellingPrice.toFixed(2)}</td>
                <!-- WHOLESALE ATTRIBUTES DISPLAY -->
                <td style="font-weight: 600; color:var(--purple-500);">${state.settings.currency}${wholesalePriceVal.toFixed(2)}</td>
                <td style="font-size:0.75rem; color:var(--text-muted);">
                    <strong>${pkgSizeVal}</strong><br>
                    <span>Wholesale: ${state.settings.currency}${(p.wholesalePrice || p.sellingPrice * 0.8).toFixed(2)}</span>
                </td>
                <td>${stockBadge}</td>
                <td class="text-center">
                    <strong>${getProductStock(p)}</strong> units
                    <div class="stock-bar-container">
                        <div class="stock-bar ${barClass}" style="width: ${stockPercent}%"></div>
                    </div>
                </td>
                <td>
                    <div class="table-actions" style="display:flex; gap:6px;">
                        ${!p.isBundle ? `<button class="btn btn-primary btn-icon-only btn-xs" style="background-color: var(--success); border-color: var(--success);" onclick="openRestockModal('${p.id}')" title="Add / Restock Product"><i class="fa-solid fa-boxes-packing"></i></button>` : ''}
                        ${p.isBundle ? `<button class="btn btn-secondary btn-icon-only btn-xs" onclick="openPackageModal(state.products.find(prod => prod.id === '${p.id}'))" title="Edit Package"><i class="fa-solid fa-pen-to-square"></i></button>` 
                        : `<button class="btn btn-secondary btn-icon-only btn-xs" onclick="triggerEditProduct('${p.id}')" title="Edit Entry"><i class="fa-solid fa-pen-to-square"></i></button>`}
                        <button class="btn btn-outline-danger btn-icon-only btn-xs" onclick="deleteProductEntry('${p.id}')" title="Delete Product"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateInventoryCategoryFilters() {
    const filter = document.getElementById("inventory-filter-category");
    if (!filter) return;

    const currentVal = filter.value;
    const categories = ["all", ...new Set(state.products.map(p => p.category))];
    filter.innerHTML = categories.map(cat => `<option value="${cat}">${cat === "all" ? "All Categories" : cat}</option>`).join('');
    filter.value = currentVal;
}

let currentPackageItems = [];

function openPackageModal(pkgObj = null) {
    document.getElementById("modal-package").classList.add("active");
    
    const select = document.getElementById("pkg-item-select");
    select.innerHTML = '<option value="">-- Select an item --</option>';
    state.products.filter(p => !p.isBundle).forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (${p.sku || 'N/A'}) - Stock: ${getProductStock(p)}</option>`;
    });

    if (pkgObj) {
        document.getElementById("package-modal-title").innerText = "Edit Package";
        document.getElementById("pkg-id").value = pkgObj.id;
        document.getElementById("pkg-name").value = pkgObj.name;
        document.getElementById("pkg-sku").value = pkgObj.sku || "";
        document.getElementById("pkg-category").value = pkgObj.category || "Package";
        document.getElementById("pkg-supplier").value = pkgObj.supplier || "";
        document.getElementById("pkg-cost").value = pkgObj.costPrice;
        document.getElementById("pkg-price").value = pkgObj.sellingPrice;
        document.getElementById("pkg-wholesale").value = pkgObj.wholesalePrice || "";
        currentPackageItems = JSON.parse(JSON.stringify(pkgObj.bundleItems || []));
    } else {
        document.getElementById("package-modal-title").innerText = "Create New Package";
        document.getElementById("pkg-id").value = "";
        document.getElementById("pkg-name").value = "";
        document.getElementById("pkg-sku").value = "";
        document.getElementById("pkg-category").value = "Package";
        document.getElementById("pkg-supplier").value = "";
        document.getElementById("pkg-cost").value = "";
        document.getElementById("pkg-price").value = "";
        document.getElementById("pkg-wholesale").value = "";
        document.getElementById("pkg-item-qty").value = "1";
        currentPackageItems = [];
    }
    renderPkgItems();
}

function closePackageModal() {
    document.getElementById("modal-package").classList.remove("active");
}

function addPkgItem() {
    const select = document.getElementById("pkg-item-select");
    const qtyInput = document.getElementById("pkg-item-qty");
    const productId = select.value;
    const qty = parseInt(qtyInput.value) || 1;

    if (!productId) return alert("Please select an item to add to the package.");

    const existing = currentPackageItems.find(item => item.id === productId);
    if (existing) {
        existing.qty += qty;
    } else {
        currentPackageItems.push({ id: productId, qty: qty });
    }
    
    let totalCost = 0;
    currentPackageItems.forEach(item => {
        const p = state.products.find(prod => prod.id === item.id);
        if (p) totalCost += (p.costPrice * item.qty);
    });
    document.getElementById("pkg-cost").value = totalCost;

    renderPkgItems();
    select.value = "";
    qtyInput.value = "1";
}

function removePkgItem(productId) {
    currentPackageItems = currentPackageItems.filter(item => item.id !== productId);
    
    let totalCost = 0;
    currentPackageItems.forEach(item => {
        const p = state.products.find(prod => prod.id === item.id);
        if (p) totalCost += (p.costPrice * item.qty);
    });
    document.getElementById("pkg-cost").value = totalCost;
    
    renderPkgItems();
}

function renderPkgItems() {
    const tbody = document.getElementById("pkg-items-list");
    tbody.innerHTML = currentPackageItems.map(item => {
        const p = state.products.find(prod => prod.id === item.id);
        const name = p ? p.name : "Unknown Item";
        return `
            <tr>
                <td>${name}</td>
                <td>${item.qty}</td>
                <td><button type="button" class="btn btn-sm btn-danger" onclick="removePkgItem('${item.id}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    }).join("");
}

function savePackage() {
    const id = document.getElementById("pkg-id").value;
    const name = document.getElementById("pkg-name").value.trim();
    const sku = document.getElementById("pkg-sku").value.trim();
    const category = document.getElementById("pkg-category").value.trim();
    const supplier = document.getElementById("pkg-supplier").value.trim();
    const cost = parseFloat(document.getElementById("pkg-cost").value) || 0;
    const price = parseFloat(document.getElementById("pkg-price").value) || 0;
    const wholesalePrice = parseFloat(document.getElementById("pkg-wholesale").value) || price;

    if (!name || !price) return alert("Please provide at least a Package Name and Retail Price.");
    if (currentPackageItems.length < 2) return alert("A package must contain at least 2 items.");

    if (id) {
        const pkg = state.products.find(p => p.id === id);
        if (pkg) {
            pkg.name = name;
            pkg.sku = sku;
            pkg.category = category;
            pkg.supplier = supplier;
            pkg.costPrice = cost;
            pkg.sellingPrice = price;
            pkg.wholesalePrice = wholesalePrice;
            pkg.bundleItems = JSON.parse(JSON.stringify(currentPackageItems));
            triggerNotification("success", "Package Updated", `${name} package updated successfully.`);
        }
    } else {
        const newPkg = {
            id: "pkg-" + Date.now(),
            isBundle: true,
            bundleItems: JSON.parse(JSON.stringify(currentPackageItems)),
            name: name,
            sku: sku,
            category: category,
            supplier: supplier,
            costPrice: cost,
            sellingPrice: price,
            wholesalePrice: wholesalePrice,
            stock: 0,
            pkgUnit: "Package"
        };
        state.products.push(newPkg);
        triggerNotification("success", "Package Created", `${name} package added successfully.`);
    }

    saveStateToServer();
    closePackageModal();
    refreshAllViews();
}

function openProductModal(productObj = null) {
    const modal = document.getElementById("modal-product");
    const titleEl = document.getElementById("product-modal-title");
    const form = document.getElementById("product-form");
    if (!modal) return;

    if (productObj) {
        titleEl.innerText = "Modify Product Entry";
        state.currentEditProductId = productObj.id;
        
        document.getElementById("product-id-field").value = productObj.id;
        document.getElementById("prod-name").value = productObj.name;
        document.getElementById("prod-sku").value = productObj.sku || "";
        document.getElementById("prod-category").value = productObj.category;
        document.getElementById("prod-supplier").value = productObj.supplier || "";
        document.getElementById("prod-cost").value = productObj.costPrice;
        document.getElementById("prod-price").value = productObj.sellingPrice;
        document.getElementById("prod-stock").value = productObj.stock;
        // Wholesale values
        document.getElementById("prod-wholesale-price").value = productObj.wholesalePrice || (productObj.sellingPrice * 0.8).toFixed(2);
        document.getElementById("prod-pkg-unit").value = productObj.pkgUnit || "1 Liter";
    } else {
        titleEl.innerText = "Register New Product";
        state.currentEditProductId = null;
        form.reset();
        document.getElementById("product-id-field").value = "";
        document.getElementById("prod-sku").value = "SKU-" + Math.floor(100000 + Math.random() * 900000);
        
        // Default wholesale values
        document.getElementById("prod-wholesale-price").value = "";
        document.getElementById("prod-pkg-unit").value = "1 Liter";
    }

    modal.classList.add("active");
}

function closeProductModal() {
    const modal = document.getElementById("modal-product");
    if (modal) modal.classList.remove("active");
    state.currentEditProductId = null;
}

// CATEGORY MANAGEMENT
function openCategoryModal() {
    renderCategoryManager();
    document.getElementById("modal-category").style.display = "flex";
}

function closeCategoryModal() {
    document.getElementById("modal-category").style.display = "none";
}

window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;

function renderCategoryManager() {
    const container = document.getElementById("category-list-container");
    if (!container) return;
    container.innerHTML = state.categories.map((cat, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid var(--border-color);">
            <span style="color:var(--text-main);">${cat}</span>
            <button type="button" class="btn-icon" style="color:var(--danger);" onclick="deleteCategory(${idx})"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join("");
    
    // Also update the datalist for the product form
    const datalist = document.getElementById("category-list");
    if (datalist) {
        datalist.innerHTML = state.categories.map(cat => `<option value="${cat}">`).join("");
    }
}

window.addCategory = function() {
    const input = document.getElementById("new-category-name");
    const val = input.value.trim();
    if (val && !state.categories.includes(val)) {
        state.categories.push(val);
        input.value = "";
        saveStateToServer();
        renderCategoryManager();
        triggerNotification("success", "Category Added", `Added '${val}' to categories.`);
    } else if (state.categories.includes(val)) {
        alert("This category already exists!");
    }
};

window.deleteCategory = function(idx) {
    if (confirm(`Are you sure you want to delete the category "${state.categories[idx]}"?`)) {
        state.categories.splice(idx, 1);
        saveStateToServer();
        renderCategoryManager();
        triggerNotification("info", "Category Deleted", "Category removed from the list.");
    }
};

function saveProductForm() {
    const id = document.getElementById("product-id-field").value;
    const name = document.getElementById("prod-name").value.trim();
    const sku = document.getElementById("prod-sku").value.trim();
    const category = document.getElementById("prod-category").value;
    const supplier = document.getElementById("prod-supplier").value.trim();
    const cost = parseFloat(document.getElementById("prod-cost").value) || 0;
    const price = parseFloat(document.getElementById("prod-price").value) || 0;
    const stock = parseInt(document.getElementById("prod-stock").value) || 0;
    // Wholesale variables
    const wholesalePrice = parseFloat(document.getElementById("prod-wholesale-price").value) || price * 0.8;
    const pkgUnit = document.getElementById("prod-pkg-unit").value.trim() || "1 Liter";

    if (id) {
        const prod = state.products.find(p => p.id === id);
        if (prod) {
            prod.name = name;
            prod.sku = sku;
            prod.category = category;
            prod.supplier = supplier;
            prod.costPrice = cost;
            prod.sellingPrice = price;
            prod.stock = stock;
            prod.wholesalePrice = wholesalePrice;
            prod.pkgUnit = pkgUnit;
            triggerNotification("success", "Inventory Updated", `${name} profile changed successfully.`);
        }
    } else {
        const newProd = {
            id: "p-" + Date.now(),
            name: name,
            sku: sku,
            category: category,
            supplier: supplier,
            costPrice: cost,
            sellingPrice: price,
            stock: stock,
            wholesalePrice: wholesalePrice,
            pkgUnit: pkgUnit
        };
        state.products.push(newProd);
        triggerNotification("success", "Product Registered", `${name} added to catalog inventory.`);
    }

    saveStateToServer();
    closeProductModal();
    refreshAllViews();
}

function triggerEditProduct(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (prod) openProductModal(prod);
}

function deleteProductEntry(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    if (confirm(`Are you sure you want to permanently delete "${prod.name}"?`)) {
        state.products = state.products.filter(p => p.id !== productId);
        saveStateToServer();
        triggerNotification("danger", "Product Removed", `${prod.name} removed.`);
        refreshAllViews();
    }
}

// --------------------------------------------------------------------------
// 10. Invoices Ledger View Controller (RETAIL HISTORY)
// --------------------------------------------------------------------------
function renderTransactions() {
    const tbody = document.getElementById("transactions-tbody");
    if (!tbody) return;

    const searchVal = document.getElementById("transactions-search")?.value.toLowerCase().trim() || "";
    const filterDate = document.getElementById("transaction-filter-date")?.value || "";
    const filterPayment = document.getElementById("transaction-filter-payment")?.value || "all";

    let ledgerList = state.transactions;

    if (filterPayment !== "all") {
        ledgerList = ledgerList.filter(t => t.paymentMethod === filterPayment);
    }

    if (filterDate.length > 0) {
        ledgerList = ledgerList.filter(t => new Date(t.timestamp).toDateString() === new Date(filterDate).toDateString());
    }

    if (searchVal.length > 0) {
        ledgerList = ledgerList.filter(t => 
            t.id.toLowerCase().includes(searchVal) || 
            (t.customer?.name && t.customer.name.toLowerCase().includes(searchVal)) ||
            (t.customer?.phone && t.customer.phone.includes(searchVal))
        );
    }

    if (ledgerList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px; color:var(--text-muted);"><i class="fa-solid fa-receipt" style="font-size:32px; margin-bottom:12px; display:block;"></i>No retail transactions found.</td></tr>`;
        return;
    }

    tbody.innerHTML = ledgerList.map(tx => {
        const datetime = new Date(tx.timestamp).toLocaleString();
        
        return `
            <tr>
                <td><strong>${tx.id}</strong></td>
                <td>${datetime}</td>
                <td>
                    <div class="product-info-cell">
                        <span class="product-cell-name">${tx.customer?.name || "Guest Customer"}</span>
                        <span class="product-cell-sku">${tx.customer?.phone || ""}</span>
                    </div>
                </td>
                <td><span class="badge badge-secondary" style="text-transform:uppercase;">${tx.paymentMethod}</span></td>
                <td>${state.settings.currency}${tx.subtotal.toFixed(2)}</td>
                <td style="color:var(--danger); font-size:0.8rem;">-${state.settings.currency}${tx.discountAmount.toFixed(2)} (${tx.discountPercent}%)</td>
                <td>${state.settings.currency}${tx.taxAmount.toFixed(2)}</td>
                <td style="font-weight: 700; color:var(--primary);">${state.settings.currency}${tx.grandTotal.toFixed(2)}</td>
                <td style="color:var(--success); font-weight:600;">+${state.settings.currency}${tx.profit.toFixed(2)}</td>
                <td>
                    <button class="btn btn-secondary btn-icon-text btn-xs animate-btn" onclick="viewReceipt('${tx.id}')">
                        <i class="fa-solid fa-eye"></i>
                        <span>Invoice</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewReceipt(receiptId) {
    const tx = state.transactions.find(t => t.id === receiptId) || state.wholesaleTransactions.find(t => t.id === receiptId);
    if (!tx) return;

    const modal = document.getElementById("modal-receipt");
    const container = document.getElementById("receipt-invoice-printout");
    if (!modal || !container) return;

    // Formatting date
    const dateObj = new Date(tx.timestamp);
    const dateStr = dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy

    // Splitting value into Rs and Cts
    const splitMoney = (amount) => {
        const parts = amount.toFixed(2).split('.');
        return { rs: parts[0], cts: parts[1] };
    };

    let itemsRows = '';
    for (let i = 0; i < tx.items.length; i++) {
        const item = tx.items[i];
        const rowTotal = item.qty * item.sellingPrice;
        const tSplit = splitMoney(rowTotal);
        itemsRows += `
            <tr>
                <td>${item.sku || '-'}</td>
                <td>${item.name}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right;">${item.sellingPrice.toFixed(2)}</td>
                <td></td> <!-- Free -->
                <td></td> <!-- Dis % -->
                <td style="text-align:right; border-right:1px solid #000;">${tSplit.rs}</td>
                <td style="text-align:right;">${tSplit.cts}</td>
            </tr>
        `;
    }

    const gSplit = splitMoney(tx.grandTotal);

    const fullCustomer = state.customers.find(c => c.id === tx.customer?.id) || tx.customer;

    container.innerHTML = `
        <div class="a4-invoice-wrapper">
            <!-- Header -->
            <div class="inv-header">
                <div class="inv-logo-left">
                    <img src="imagesB.jpg" alt="Browns Logo" style="max-width: 140px; max-height: 80px; object-fit: contain;">
                </div>
                <div class="inv-header-center">
                    <h1 class="inv-company-title">BROWNS & COMPANY PLC</h1>
                    <h2 class="inv-subtitle">Thriller Motors (Pvt)Ltd</h2>
                    <h3 class="inv-address">Aluthgama, Bogamuwa, Kalagedihena</h3>
                    <h3 class="inv-contact">Mobile No. 0773427057 /0766275271</h3>
                </div>
                <div class="inv-logo-right">
                    <img src="imagesG.png" alt="Gulf Logo" style="max-width: 100px; max-height: 100px; object-fit: contain;">
                </div>
            </div>

            <hr class="inv-divider-top">

            <!-- Customer Details -->
            <div class="inv-details">
                <div class="inv-details-left">
                    <div class="detail-row">
                        <span class="detail-label">Name of Customer ;</span>
                        <span class="detail-value" style="font-weight:bold;">${fullCustomer?.name || "Guest Customer"}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Address ;</span>
                        <span class="detail-value">${fullCustomer?.address || "..................................................."}</span>
                    </div>
                </div>
                <div class="inv-details-right">
                    <div class="detail-row">
                        <span class="detail-label">Invoice No ;</span>
                        <span class="detail-value" style="font-weight:bold; padding-left:10px;">${tx.id.replace('W-INV-', '').replace('TX-', '')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Customer Code ;</span>
                        <span class="detail-value" style="padding-left:10px;">${tx.customer?.id || ""}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date ;</span>
                        <span class="detail-value" style="padding-left:10px;">${dateStr}.</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="inv-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:14%;">Product Code</th>
                        <th rowspan="2" style="width:40%;">Product Description</th>
                        <th rowspan="2" style="width:6%;">Qty</th>
                        <th rowspan="2" style="width:12%;">Unit Price</th>
                        <th colspan="2" style="width:12%;">Offers</th>
                        <th colspan="2" style="width:16%;">Amount</th>
                    </tr>
                    <tr>
                        <th style="width:6%;">Free</th>
                        <th style="width:6%;">Dis %</th>
                        <th style="width:10%; border-right:1px solid #000;">Rs</th>
                        <th style="width:6%;">Cts.</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr class="inv-total-row">
                        <td colspan="6" style="text-align:left; font-weight:bold;">Total</td>
                        <td style="text-align:right; font-weight:bold; border-right:1px solid #000;">${gSplit.rs}</td>
                        <td style="text-align:right; font-weight:bold;">${gSplit.cts}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Footer Signatures -->
            <div class="inv-footer-sigs">
                <div class="sig-box">
                    <div class="sig-line">........................................</div>
                    <div class="sig-title">Signature<br>Sales Representative</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line">........................................</div>
                    <div class="sig-title">Customer Signature<br>(With Rubber Stamp)</div>
                </div>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById("btn-close-receipt-modal");
    const closeFtr = document.getElementById("btn-close-receipt-footer");
    const printBtn = document.getElementById("btn-print-receipt");
    const downloadBtn = document.getElementById("btn-download-pdf");

    const dismissModal = () => modal.classList.remove("active");
    if(closeBtn) closeBtn.onclick = dismissModal;
    if(closeFtr) closeFtr.onclick = dismissModal;
    if(printBtn) printBtn.onclick = () => window.print();
    if(downloadBtn) {
        downloadBtn.onclick = () => {
            const element = document.getElementById("receipt-invoice-printout");
            
            // Temporarily remove max-height and overflow to prevent PDF truncation
            element.style.maxHeight = 'none';
            element.style.overflow = 'visible';

            const opt = {
                margin:       0.2,
                filename:     `Invoice_${tx.id}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Restore CSS after generating
                element.style.maxHeight = '';
                element.style.overflow = '';
            });
        };
    }

    modal.classList.add("active");
}

// --------------------------------------------------------------------------
// 11. B2B & Retail Customers Directory Controller
// --------------------------------------------------------------------------
function setupCustomerEvents() {
    const registerBtn = document.getElementById("btn-add-customer");
    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            openCustomerModal();
        });
    }

    document.getElementById("btn-close-customer-modal")?.addEventListener("click", closeCustomerModal);
    document.getElementById("btn-cancel-customer-modal")?.addEventListener("click", closeCustomerModal);

    // Toggle credit limit visibility based on account type selection
    const accountTypeSelect = document.getElementById("cust-account-type");
    if (accountTypeSelect) {
        accountTypeSelect.addEventListener("change", (e) => {
            const limitContainer = document.getElementById("credit-limit-container");
            if (limitContainer) {
                if (e.target.value === "credit" || e.target.value === "cash-credit") {
                    limitContainer.style.display = "block";
                    const limitInput = document.getElementById("cust-credit-limit");
                    if (limitInput && parseFloat(limitInput.value) === 0) {
                        limitInput.value = 5000;
                    }
                } else {
                    limitContainer.style.display = "none";
                    const limitInput = document.getElementById("cust-credit-limit");
                    if (limitInput) {
                        limitInput.value = 0;
                    }
                }
            }
        });
    }

    const form = document.getElementById("customer-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveCustomerForm();
        });
    }

    document.getElementById("customers-search")?.addEventListener("input", renderCustomers);
}

function renderCustomers() {
    const container = document.getElementById("customers-grid-container");
    if (!container) return;

    const query = document.getElementById("customers-search")?.value.toLowerCase().trim() || "";
    
    let list = state.customers;

    if (query.length > 0) {
        list = list.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.phone.includes(query) || 
            (c.companyName && c.companyName.toLowerCase().includes(query)) ||
            (c.address && c.address.toLowerCase().includes(query))
        );
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-state" style="grid-column: 1/-1; padding: 60px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md);">
                <i class="fa-solid fa-users-slash"></i>
                <p>No customers matched your search query</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(c => {
        const isCredit = c.creditLimit > 0;
        const availableCredit = c.creditLimit - (c.outstandingDebt || 0);
        const salesmanName = c.salesman || "Shemal";
        
        const salesmanBadge = salesmanName === "Shemal"
            ? `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: var(--purple-500); border: 1px solid rgba(168, 85, 247, 0.3); font-weight:600; padding:2px 6px; font-size:0.65rem;">Mr. Shemal</span>`
            : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--amber-500); border: 1px solid rgba(245, 158, 11, 0.3); font-weight:600; padding:2px 6px; font-size:0.65rem;">Mr. Kaveen</span>`;
            
        const accountTypeBadge = isCredit
            ? `<span class="badge animate-pulse-subtle" style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); font-weight:600; padding:2px 6px; font-size:0.65rem;">Credit Account</span>`
            : `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); font-weight:600; padding:2px 6px; font-size:0.65rem;">Cash Account</span>`;

        let creditDetails = "";
        if (isCredit) {
            creditDetails = `
                <div style="display:flex; justify-content:space-between; color:var(--danger); font-weight:600;">
                    <span>Outstanding Debt:</span><span>${state.settings.currency}${c.outstandingDebt.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; color:var(--success); font-weight:600;">
                    <span>Available Credit:</span><span>${state.settings.currency}${availableCredit.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; color:var(--text-muted);">
                    <span>Credit Limit:</span><span>${state.settings.currency}${c.creditLimit.toFixed(2)}</span>
                </div>
            `;
        } else {
            creditDetails = `
                <div style="display:flex; justify-content:space-between; color:#3b82f6; font-weight:600;">
                    <span>Terms:</span><span>Cash / Immediate Wire</span>
                </div>
            `;
        }

        return `
            <div class="customer-card border-wholesale" style="background: var(--card-bg-glass); border-radius: var(--border-radius-md); padding: 20px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px; transition: transform var(--transition-normal), box-shadow var(--transition-normal);">
                <div class="customer-header" style="display: flex; gap: 15px; align-items: flex-start;">
                    <div class="customer-icon" style="background: rgba(168, 85, 247, 0.1); color: var(--purple-500); width: 44px; height: 44px; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(168, 85, 247, 0.2);">
                        <i class="fa-solid fa-building"></i>
                    </div>
                    <div class="customer-profile-details" style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                        <span class="customer-profile-name" style="font-weight: 700; color: var(--text-main); font-size: 1.1rem; line-height: 1.2;">${c.companyName || c.name}</span>
                        <span class="customer-profile-phone" style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="margin-right: 4px; font-size: 0.75rem;"></i>${c.phone}</span>
                    </div>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 6px; align-items: flex-start; margin-top: -4px;">
                    <i class="fa-solid fa-location-dot" style="margin-top: 3px; font-size: 0.75rem; color: var(--text-muted);"></i>
                    <span style="line-height: 1.3;">${c.address || "No address registered"}</span>
                </div>

                <div class="customer-badges" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${accountTypeBadge}
                    ${salesmanBadge}
                </div>

                <div class="customer-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 10px 0; margin-top: 4px;">
                    <div class="cust-stat" style="display: flex; flex-direction: column; align-items: center;">
                        <span class="cust-stat-label" style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Invoices</span>
                        <span class="cust-stat-val" style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${c.purchaseCount || 0}</span>
                    </div>
                    <div class="cust-stat" style="display: flex; flex-direction: column; align-items: center;">
                        <span class="cust-stat-label" style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Loyalty Points</span>
                        <span class="cust-stat-val" style="font-weight: 700; font-size: 1rem; color: var(--primary);">${c.loyaltyPoints || 0} pts</span>
                    </div>
                </div>

                <div class="b2b-financial-ledger" style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 5px; background: rgba(255,255,255,0.01); border-radius: 6px; padding: 10px; border: 1px solid var(--border-color);">
                    ${creditDetails}
                </div>
                
                <div class="customer-actions" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: auto;">
                    <button class="btn btn-secondary btn-icon-only btn-xs" onclick="triggerEditCustomer('${c.id}')" title="Edit Profile"><i class="fa-solid fa-user-pen"></i></button>
                    <button class="btn btn-outline-danger btn-icon-only btn-xs" onclick="deleteCustomerEntry('${c.id}')" title="Delete Profile"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openCustomerModal(custObj = null) {
    const modal = document.getElementById("modal-customer");
    const titleEl = document.getElementById("customer-modal-title");
    const form = document.getElementById("customer-form");
    const limitContainer = document.getElementById("credit-limit-container");
    
    if (!modal) return;

    if (custObj) {
        titleEl.innerText = "Edit B2B Customer Profile";
        document.getElementById("customer-id-field").value = custObj.id;
        document.getElementById("cust-name").value = custObj.name;
        document.getElementById("cust-phone").value = custObj.phone;
        document.getElementById("cust-address").value = custObj.address || "";
        
        const isCredit = custObj.creditLimit > 0;
        document.getElementById("cust-account-type").value = custObj.accountType || (isCredit ? "credit" : "cash");
        document.getElementById("cust-credit-limit").value = custObj.creditLimit || 0;
        document.getElementById("cust-salesman").value = custObj.salesman || "Shemal";
        
        if (limitContainer) {
            limitContainer.style.display = isCredit ? "block" : "none";
        }
    } else {
        titleEl.innerText = "Register B2B Customer Profile";
        form.reset();
        document.getElementById("customer-id-field").value = "";
        document.getElementById("cust-account-type").value = "credit";
        document.getElementById("cust-credit-limit").value = 5000;
        document.getElementById("cust-salesman").value = "Shemal";
        if (limitContainer) {
            limitContainer.style.display = "block";
        }
    }

    modal.classList.add("active");
}

function closeCustomerModal() {
    const modal = document.getElementById("modal-customer");
    if (modal) modal.classList.remove("active");
}

function saveCustomerForm() {
    const id = document.getElementById("customer-id-field").value;
    const name = document.getElementById("cust-name").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const accountType = document.getElementById("cust-account-type").value;
    const salesman = document.getElementById("cust-salesman").value;

    if (!name || !phone) {
        alert("Please fill in the required fields (Name and Phone).");
        return;
    }

    if (phone.replace(/[^0-9]/g, '').length !== 10) {
        alert("Phone number must contain exactly 10 digits!");
        return;
    }
    
    let creditLimit = 0;
    if (accountType === "credit" || accountType === "cash-credit") {
        creditLimit = parseFloat(document.getElementById("cust-credit-limit").value) || 0;
    }

    if (id) {
        const cust = state.customers.find(c => c.id === id);
        if (cust) {
            cust.name = name;
            cust.companyName = name; // Map company name to customer name for B2B compatibility
            cust.address = address;
            cust.phone = phone;
            cust.creditLimit = creditLimit;
            cust.salesman = salesman;
            cust.isWholesale = true; // Always B2B
            cust.accountType = accountType;
            cust.outstandingDebt = cust.outstandingDebt || 0;
            triggerNotification("success", "Customer Edited", `${name}'s profile was updated successfully.`);
        }
    } else {
        const newCust = {
            id: "c-" + Date.now(),
            name: name,
            companyName: name, // Map company name to customer name for B2B compatibility
            address: address,
            phone: phone,
            purchaseCount: 0,
            loyaltyPoints: 0,
            isWholesale: true, // Always B2B
            creditLimit: creditLimit,
            salesman: salesman,
            accountType: accountType,
            outstandingDebt: 0.00
        };
        state.customers.push(newCust);
        triggerNotification("success", "Customer Registered", `${name} has been registered.`);
    }

    saveStateToServer();
    closeCustomerModal();
    refreshAllViews();
}

function triggerEditCustomer(customerId) {
    const cust = state.customers.find(c => c.id === customerId);
    if (cust) openCustomerModal(cust);
}

function deleteCustomerEntry(customerId) {
    const cust = state.customers.find(c => c.id === customerId);
    if (!cust) return;

    if (confirm(`Are you sure you want to delete "${cust.name}"?`)) {
        state.customers = state.customers.filter(c => c.id !== customerId);
        saveStateToServer();
        triggerNotification("danger", "Customer Deleted", `${cust.name} removed.`);
        refreshAllViews();
    }
}

// --------------------------------------------------------------------------
// 12. Settings Accent Customizer & Admin Operations Controller
// --------------------------------------------------------------------------
function setupSettingsEvents() {
    const storeForm = document.getElementById("settings-store-form");
    if (storeForm) {
        storeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            state.settings.storeName = document.getElementById("setting-store-name").value.trim();
            state.settings.currency = document.getElementById("setting-currency").value.trim();
            state.settings.taxRate = parseFloat(document.getElementById("setting-tax-rate").value) || 0;
            state.settings.address = document.getElementById("setting-store-address").value.trim();
            state.settings.phone = document.getElementById("setting-store-phone").value.trim();
            state.settings.receiptFooter = document.getElementById("setting-receipt-footer").value.trim();
            state.settings.lowStockLimit = parseInt(document.getElementById("setting-low-stock-limit").value) || 5;

            document.getElementById("sidebar-shop-name").innerText = state.settings.storeName;

            saveStateToServer();
            triggerNotification("success", "Settings Saved", "Store preferences successfully updated.");
            refreshAllViews();
            alert("Settings saved successfully!");
        });
    }

    const dots = document.querySelectorAll(".accent-color-selector .accent-dot");
    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            dots.forEach(d => d.classList.remove("active"));
            dot.classList.add("active");
            
            const color = dot.getAttribute("data-color");
            state.settings.accentColor = color;
            
            applyThemeAccent(color);
            saveStateToServer();
            
            if (state.activeTab === "dashboard") {
                renderDashboard();
            }
        });
    });

    document.getElementById("btn-load-demo")?.addEventListener("click", () => {
        if (confirm("Are you sure you want to load full demo data?")) {
            generateDemoData();
            refreshAllViews();
            alert("Demo database installed successfully!");
        }
    });

    document.getElementById("btn-clear-db")?.addEventListener("click", async () => {
        const pass = await promptOwnerPassword("Please enter the Owner Password to clear all data:");
        if (pass === null) return; // cancelled
        const currentOwnerPass = state.settings.ownerPassword || "admin123";
        if (pass === currentOwnerPass) {
            if (await confirmAction("WARNING: This will permanently wipe all local datasets. Are you absolutely sure?", true)) {
                state.products = [];
                state.transactions = [];
                state.wholesaleTransactions = [];
                state.purchaseInvoices = [];
                state.customers = [];
                state.notifications = [];
                state.cheques = [];
                state.expenses = [];
                state.employees = [];
                saveStateToServer();
                refreshAllViews();
                alert("Database purged successfully!");
            }
        } else if (pass !== null) {
            alert("Incorrect password. Data was not cleared.");
        }
    });
}

function applyThemeAccent(colorName) {
    const root = document.documentElement;
    document.querySelectorAll(".accent-color-selector .accent-dot").forEach(d => {
        if (d.getAttribute("data-color") === colorName) {
            d.classList.add("active");
        } else {
            d.classList.remove("active");
        }
    });

    switch(colorName) {
        case "sapphire":
            root.style.setProperty('--primary', 'var(--sapphire-500)');
            root.style.setProperty('--primary-hover', 'var(--sapphire-600)');
            root.style.setProperty('--primary-glow', 'hsla(217, 91%, 56%, 0.18)');
            break;
        case "crimson":
            root.style.setProperty('--primary', 'var(--crimson-500)');
            root.style.setProperty('--primary-hover', 'var(--crimson-600)');
            root.style.setProperty('--primary-glow', 'hsla(348, 83%, 58%, 0.18)');
            break;
        case "amber":
            root.style.setProperty('--primary', 'var(--amber-500)');
            root.style.setProperty('--primary-hover', 'var(--amber-600)');
            root.style.setProperty('--primary-glow', 'hsla(38, 92%, 50%, 0.18)');
            break;
        case "purple":
            root.style.setProperty('--primary', 'var(--purple-500)');
            root.style.setProperty('--primary-hover', 'var(--purple-600)');
            root.style.setProperty('--primary-glow', 'hsla(265, 83%, 60%, 0.18)');
            break;
        case "rose":
            root.style.setProperty('--primary', 'var(--rose-500)');
            root.style.setProperty('--primary-hover', 'var(--rose-600)');
            root.style.setProperty('--primary-glow', 'hsla(350, 89%, 60%, 0.18)');
            break;
        case "teal":
            root.style.setProperty('--primary', 'var(--teal-500)');
            root.style.setProperty('--primary-hover', 'var(--teal-600)');
            root.style.setProperty('--primary-glow', 'hsla(171, 77%, 44%, 0.18)');
            break;
        case "indigo":
            root.style.setProperty('--primary', 'var(--indigo-500)');
            root.style.setProperty('--primary-hover', 'var(--indigo-600)');
            root.style.setProperty('--primary-glow', 'hsla(239, 84%, 67%, 0.18)');
            break;
        case "emerald":
        default:
            root.style.setProperty('--primary', 'var(--emerald-500)');
            root.style.setProperty('--primary-hover', 'var(--emerald-600)');
            root.style.setProperty('--primary-glow', 'hsla(162, 76%, 41%, 0.18)');
            break;
    }
}

// --------------------------------------------------------------------------
// 13. Cheque Management System Controllers
// --------------------------------------------------------------------------
function setupChequeRegistryEvents() {
    const searchInput = document.getElementById("cheque-search");
    if (searchInput) {
        searchInput.addEventListener("input", renderCheques);
    }

    const filterStatus = document.getElementById("cheque-filter-status");
    if (filterStatus) {
        filterStatus.addEventListener("change", renderCheques);
    }

    const resetBtn = document.getElementById("btn-cheque-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (filterStatus) filterStatus.value = "all";
            renderCheques();
        });
    }

    // Manual Add Modal wire-up
    document.getElementById("btn-add-cheque")?.addEventListener("click", openAddChequeModal);
    document.getElementById("btn-close-add-cheque-modal")?.addEventListener("click", closeAddChequeModal);
    document.getElementById("btn-cancel-add-cheque-modal")?.addEventListener("click", closeAddChequeModal);

    // ---- Live-search customer picker for Add Cheque modal ----
    const chequeSearchInput = document.getElementById("cheque-customer-search");
    const chequeDropdown    = document.getElementById("cheque-customer-dropdown");

    function renderChequeCustomerDropdown(query) {
        if (!chequeDropdown) return;
        const q = (query || "").toLowerCase().trim();
        const list = state.customers.filter(c => {
            const n = (c.companyName || c.name || "").toLowerCase();
            const p = (c.phone || "").toLowerCase();
            return !q || n.includes(q) || p.includes(q);
        }).sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name));

        if (list.length === 0) {
            chequeDropdown.innerHTML = `<div style="padding:10px 14px; color:var(--text-muted); font-size:0.82rem;">No customers found</div>`;
        } else {
            chequeDropdown.innerHTML = list.map(c => {
                const debt = (c.outstandingDebt || 0);
                const debtStr = debt > 0
                    ? `<span style="margin-left:auto; color:#ef4444; font-size:0.72rem; font-weight:700;">Debt: ${state.settings.currency}${debt.toFixed(2)}</span>`
                    : `<span style="margin-left:auto; color:var(--success); font-size:0.72rem;">Clear</span>`;
                const label = c.companyName && c.companyName !== c.name ? `${c.companyName} (${c.name})` : (c.name || c.companyName);
                return `<div data-cust-id="${c.id}" style="padding:9px 14px; cursor:pointer; font-size:0.84rem; display:flex; align-items:center; gap:6px; border-bottom:1px solid rgba(255,255,255,0.04); transition: background 0.15s;" onmouseover="this.style.background='rgba(168,85,247,0.12)'" onmouseout="this.style.background=''">
                    <i class="fa-solid fa-user-tie" style="color:var(--text-muted); font-size:0.75rem;"></i>
                    <span>${label}</span>${debtStr}
                </div>`;
            }).join('');
        }
        chequeDropdown.style.display = "block";

        // Click to select
        chequeDropdown.querySelectorAll("[data-cust-id]").forEach(el => {
            el.addEventListener("click", () => {
                const custId = el.getAttribute("data-cust-id");
                selectChequeCustomer(custId);
            });
        });
    }

    function selectChequeCustomer(custId) {
        const cust = state.customers.find(c => c.id === custId);
        if (!cust) return;

        // Set hidden select value
        const hiddenSelect = document.getElementById("cheque-customer-select");
        if (hiddenSelect) {
            hiddenSelect.innerHTML = `<option value="${cust.id}" selected>${cust.companyName || cust.name}</option>`;
        }

        // Update search box
        const label = cust.companyName && cust.companyName !== cust.name ? `${cust.companyName} (${cust.name})` : (cust.name || cust.companyName);
        if (chequeSearchInput) chequeSearchInput.value = label;

        // Update selected badge
        const badge = document.getElementById("cheque-selected-customer");
        const badgeLabel = document.getElementById("cheque-selected-customer-label");
        if (badge) badge.style.display = "flex";
        if (badgeLabel) badgeLabel.innerText = label;

        // Update debt info
        const info = document.getElementById("cheque-customer-debt-info");
        if (info) {
            const debt = (cust.outstandingDebt || 0).toFixed(2);
            info.innerText = `Outstanding Debt: ${state.settings.currency}${debt}`;
            info.style.color = parseFloat(debt) > 0 ? "#ef4444" : "var(--success)";
        }

        // Hide dropdown
        if (chequeDropdown) chequeDropdown.style.display = "none";
    }

    if (chequeSearchInput) {
        chequeSearchInput.addEventListener("input", () => {
            renderChequeCustomerDropdown(chequeSearchInput.value);
            // Clear selection when typing again
            const badge = document.getElementById("cheque-selected-customer");
            if (badge) badge.style.display = "none";
            const hiddenSelect = document.getElementById("cheque-customer-select");
            if (hiddenSelect) hiddenSelect.innerHTML = '<option value="" disabled selected></option>';
        });
        chequeSearchInput.addEventListener("focus", () => {
            renderChequeCustomerDropdown(chequeSearchInput.value);
        });
    }

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
        if (chequeDropdown && !chequeDropdown.contains(e.target) && e.target !== chequeSearchInput) {
            chequeDropdown.style.display = "none";
        }
    });


    const addChequeForm = document.getElementById("add-cheque-form");
    if (addChequeForm) {
        addChequeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const customerId = document.getElementById("cheque-customer-select").value;
            const amount = parseFloat(document.getElementById("cheque-amount-input").value) || 0;
            const chequeNo = document.getElementById("cheque-no-input").value.trim();
            const bankName = document.getElementById("cheque-bank-input").value.trim();
            const branchName = document.getElementById("cheque-branch-input").value.trim();
            const receivedDate = document.getElementById("cheque-received-date-input").value;
            const depositDate = document.getElementById("cheque-deposit-date-input").value;
            const emergencyDate = document.getElementById("cheque-emergency-date-input").value || null;

            const cust = state.customers.find(c => c.id === customerId);
            if (!cust) {
                alert("Please select a valid customer.");
                return;
            }

            if (amount <= 0) {
                alert("Please enter a valid cheque amount.");
                return;
            }

            // Prevent duplicate cheque numbers
            const existingCheque = state.cheques.find(c => c.chequeNumber === chequeNo);
            if (existingCheque) {
                alert("This cheque number has already been added to the system!");
                return;
            }

            // Deduct from customer debt
            const prevDebt = cust.outstandingDebt || 0;
            cust.outstandingDebt = Math.max(0, prevDebt - amount);

            // FIFO allocation of the payment to outstanding B2B wholesale transactions
            let remainingPayment = amount;
            const unpaidTxs = state.wholesaleTransactions
                .filter(tx => tx.customer?.id === customerId && tx.status !== "paid" && tx.outstandingBalance > 0)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            for (let tx of unpaidTxs) {
                if (remainingPayment <= 0) break;
                const paymentToApply = Math.min(remainingPayment, tx.outstandingBalance);
                tx.outstandingBalance = Math.max(0, tx.outstandingBalance - paymentToApply);
                tx.amountPaid += paymentToApply;
                if (tx.outstandingBalance === 0) {
                    tx.status = "paid";
                }
                remainingPayment -= paymentToApply;
            }

            // Log the cheque
            const newCheque = {
                id: "CHQ-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                chequeNumber: chequeNo,
                bankName: bankName,
                branchName: branchName,
                receivedDate: receivedDate,
                depositDate: depositDate,
                emergencyRequestDate: emergencyDate,
                amount: amount,
                status: emergencyDate ? "postponed" : "pending",
                customer: {
                    id: cust.id,
                    name: cust.name,
                    companyName: cust.companyName || cust.name
                },
                invoiceId: null,
                salesman: cust.salesman || "Shemal"
            };

            state.cheques.push(newCheque);
            saveStateToServer();
            
            closeAddChequeModal();
            addChequeForm.reset();
            const info = document.getElementById("cheque-customer-debt-info");
            if (info) info.innerText = `Active Credit Debt: ${state.settings.currency}0.00`;

            refreshAllViews();
            triggerNotification("success", "Cheque Recorded", `Manually logged cheque ${chequeNo} of ${state.settings.currency}${amount.toFixed(2)} for ${cust.companyName || cust.name}.`);
            alert("Cheque recorded successfully and credited to customer's account!");
        });
    }

    // Reschedule Modal close events
    document.getElementById("btn-close-reschedule-modal")?.addEventListener("click", closeRescheduleModal);
    document.getElementById("btn-cancel-reschedule-modal")?.addEventListener("click", closeRescheduleModal);

    const rescheduleForm = document.getElementById("reschedule-cheque-form");
    if (rescheduleForm) {
        rescheduleForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const chequeId = document.getElementById("reschedule-cheque-id").value;
            const newEmergDate = document.getElementById("reschedule-cheque-emergency").value;

            const cheque = state.cheques.find(c => c.id === chequeId);
            if (!cheque) return;

            // If the cheque was previously bounced, we need to re-represent it:
            // deduct the remaining unpaid amount from customer's outstanding debt
            if (cheque.status === "bounced") {
                const cashPaid = (cheque.cashPayments || []).reduce((s, p) => s + p.amount, 0);
                const remaining = Math.max(0, cheque.amount - cashPaid);

                if (remaining > 0) {
                    // Reduce customer debt back (cheque is being represented)
                    const cust = state.customers.find(c => c.id === cheque.customer.id);
                    if (cust) {
                        cust.outstandingDebt = Math.max(0, (cust.outstandingDebt || 0) - remaining);
                    }

                    // Reconcile invoice / FIFO
                    let leftover = remaining;
                    if (cheque.invoiceId) {
                        const tx = state.wholesaleTransactions.find(t => t.id === cheque.invoiceId);
                        if (tx && tx.outstandingBalance > 0) {
                            const apply = Math.min(leftover, tx.outstandingBalance);
                            tx.outstandingBalance = Math.max(0, tx.outstandingBalance - apply);
                            tx.amountPaid = (tx.amountPaid || 0) + apply;
                            if (tx.outstandingBalance === 0) tx.status = "paid";
                            leftover -= apply;
                        }
                    }
                    if (leftover > 0) {
                        const unpaidTxs = state.wholesaleTransactions
                            .filter(tx => tx.customer?.id === cheque.customer.id && tx.status !== "paid" && tx.outstandingBalance > 0)
                            .sort((a, b) => new Date(a.date) - new Date(b.date));
                        for (let tx of unpaidTxs) {
                            if (leftover <= 0) break;
                            const apply = Math.min(leftover, tx.outstandingBalance);
                            tx.outstandingBalance = Math.max(0, tx.outstandingBalance - apply);
                            tx.amountPaid = (tx.amountPaid || 0) + apply;
                            if (tx.outstandingBalance === 0) tx.status = "paid";
                            leftover -= apply;
                        }
                    }
                }
            }

            cheque.emergencyRequestDate = newEmergDate;
            cheque.status = newEmergDate ? "postponed" : "pending";

            saveStateToServer();
            closeRescheduleModal();
            refreshAllViews();
            triggerNotification("warning", "Cheque Rescheduled", `Cheque ${cheque.chequeNumber} rescheduled to ${new Date(newEmergDate).toLocaleDateString()}.`);
            alert("Cheque rescheduled successfully!");
        });
    }

    // Settle Returned Cheque (Cash) Modal wire-up
    document.getElementById("btn-close-settle-returned-modal")?.addEventListener("click", closeSettleReturnedChequeModal);
    document.getElementById("btn-cancel-settle-returned-modal")?.addEventListener("click", closeSettleReturnedChequeModal);

    const settleReturnedForm = document.getElementById("settle-returned-cheque-form");
    if (settleReturnedForm) {
        settleReturnedForm.addEventListener("submit", (e) => {
            e.preventDefault();
            saveSettleReturnedCheque();
        });
    }
}

function openAddChequeModal() {
    const modal = document.getElementById("modal-add-cheque");
    if (!modal) return;

    // Reset Form
    const form = document.getElementById("add-cheque-form");
    if (form) form.reset();

    const info = document.getElementById("cheque-customer-debt-info");
    if (info) { info.innerText = `Outstanding Debt: ${state.settings.currency}0.00`; info.style.color = "var(--text-muted)"; }

    // Reset live-search UI
    const searchBox = document.getElementById("cheque-customer-search");
    if (searchBox) searchBox.value = "";
    const dropdown = document.getElementById("cheque-customer-dropdown");
    if (dropdown) dropdown.style.display = "none";
    const badge = document.getElementById("cheque-selected-customer");
    if (badge) badge.style.display = "none";
    const hiddenSelect = document.getElementById("cheque-customer-select");
    if (hiddenSelect) hiddenSelect.innerHTML = '<option value="" disabled selected></option>';

    modal.classList.add("active");
}

function closeAddChequeModal() {
    const modal = document.getElementById("modal-add-cheque");
    if (modal) modal.classList.remove("active");
}

function openRescheduleModal(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    const modal = document.getElementById("modal-reschedule-cheque");
    if (!modal) return;

    document.getElementById("reschedule-cheque-id").value = cheque.id;
    document.getElementById("reschedule-cheque-number").value = cheque.chequeNumber;
    document.getElementById("reschedule-cheque-company").value = cheque.customer?.companyName || cheque.customer?.name;
    document.getElementById("reschedule-cheque-amount").value = `${state.settings.currency}${cheque.amount.toFixed(2)}`;
    document.getElementById("reschedule-cheque-planned").value = cheque.depositDate;
    document.getElementById("reschedule-cheque-emergency").value = cheque.emergencyRequestDate || "";

    modal.classList.add("active");
}

function closeRescheduleModal() {
    const modal = document.getElementById("modal-reschedule-cheque");
    if (modal) modal.classList.remove("active");
}

function renderCheques() {
    const tbody = document.getElementById("cheque-tbody");
    if (!tbody) return;

    // 1. Calculate Stats
    let pendingSum = 0, pendingCount = 0;
    let postponedSum = 0, postponedCount = 0;
    let holdSum = 0, holdCount = 0;
    let clearedSum = 0, clearedCount = 0;
    let bouncedSum = 0, bouncedCount = 0;

    state.cheques.forEach(chq => {
        const amt = chq.amount || 0;
        if (chq.status === "pending") {
            pendingSum += amt;
            pendingCount++;
        } else if (chq.status === "postponed") {
            postponedSum += amt;
            postponedCount++;
        } else if (chq.status === "hold") {
            holdSum += amt;
            holdCount++;
        } else if (chq.status === "cleared") {
            clearedSum += amt;
            clearedCount++;
        } else if (chq.status === "bounced") {
            bouncedSum += amt;
            bouncedCount++;
        }
    });

    const cSymbol = state.settings.currency;
    
    const pValEl = document.getElementById("stat-cheque-pending-val");
    if (pValEl) pValEl.innerText = `${cSymbol}${pendingSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pCntEl = document.getElementById("stat-cheque-pending-count");
    if (pCntEl) pCntEl.innerText = `${pendingCount} Cheque${pendingCount === 1 ? '' : 's'}`;

    const postValEl = document.getElementById("stat-cheque-postponed-val");
    if (postValEl) postValEl.innerText = `${cSymbol}${postponedSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const postCntEl = document.getElementById("stat-cheque-postponed-count");
    if (postCntEl) postCntEl.innerText = `${postponedCount} Cheque${postponedCount === 1 ? '' : 's'}`;

    const clrValEl = document.getElementById("stat-cheque-cleared-val");
    if (clrValEl) clrValEl.innerText = `${cSymbol}${clearedSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const clrCntEl = document.getElementById("stat-cheque-cleared-count");
    if (clrCntEl) clrCntEl.innerText = `${clearedCount} Cheque${clearedCount === 1 ? '' : 's'}`;

    const holdValEl = document.getElementById("stat-cheque-hold-val");
    if (holdValEl) holdValEl.innerText = `${cSymbol}${holdSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const holdCntEl = document.getElementById("stat-cheque-hold-count");
    if (holdCntEl) holdCntEl.innerText = `${holdCount} Cheque${holdCount === 1 ? '' : 's'}`;

    const bncValEl = document.getElementById("stat-cheque-bounced-val");
    if (bncValEl) bncValEl.innerText = `${cSymbol}${bouncedSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const bncCntEl = document.getElementById("stat-cheque-bounced-count");
    if (bncCntEl) bncCntEl.innerText = `${bouncedCount} Cheque${bouncedCount === 1 ? '' : 's'}`;

    // 2. Filter & Search
    const searchVal = (document.getElementById("cheque-search")?.value || "").toLowerCase().trim();
    const filterStatus = document.getElementById("cheque-filter-status")?.value || "all";

    let filtered = state.cheques || [];

    if (filterStatus !== "all") {
        filtered = filtered.filter(chq => chq.status === filterStatus);
    }

    if (searchVal) {
        filtered = filtered.filter(chq => {
            const num = (chq.chequeNumber || "").toLowerCase();
            const bank = (chq.bankName || "").toLowerCase();
            const branch = (chq.branchName || "").toLowerCase();
            const comp = (chq.customer?.companyName || chq.customer?.name || "").toLowerCase();
            return num.includes(searchVal) || bank.includes(searchVal) || branch.includes(searchVal) || comp.includes(searchVal);
        });
    }

    // Sort by receivedDate (newest first)
    filtered.sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate));

    // 3. Render Table rows
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px; background: rgba(255,255,255,0.01);">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; display:block; margin-bottom:10px;"></i>
                    No cheques found matching the criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(chq => {
        let badgeClass = "";
        let statusLabel = "";
        if (chq.status === "pending") {
            badgeClass = "badge-pending";
            statusLabel = "Pending Deposit";
        } else if (chq.status === "postponed") {
            badgeClass = "badge-postponed";
            statusLabel = "Postponed / Rescheduled";
        } else if (chq.status === "hold") {
            badgeClass = "badge-hold";
            statusLabel = "On Hold";
        } else if (chq.status === "cleared") {
            badgeClass = "badge-cleared";
            statusLabel = "Cleared";
        } else if (chq.status === "bounced") {
            badgeClass = "badge-bounced pulse-danger";
            statusLabel = "Bounced";
        }

        // Calculate cash paid and remaining for bounced cheques
        const cashPaid = (chq.cashPayments || []).reduce((s, p) => s + p.amount, 0);
        const remaining = Math.max(0, chq.amount - cashPaid);

        // Build cash payment history mini-table for bounced cheques
        let cashHistoryHtml = "";
        if (chq.status === "bounced" && (chq.cashPayments || []).length > 0) {
            const rows = (chq.cashPayments || []).map((p, i) =>
                `<tr><td style="padding:2px 6px; font-size:0.7rem; color:var(--text-muted);">#${i+1}</td><td style="padding:2px 6px; font-size:0.7rem; color:var(--success); font-weight:600;">${cSymbol}${p.amount.toFixed(2)}</td><td style="padding:2px 6px; font-size:0.7rem; color:var(--text-muted);">${new Date(p.date).toLocaleDateString()}</td></tr>`
            ).join('');
            cashHistoryHtml = `
                <div style="margin-top:6px; background:rgba(16,185,129,0.07); border-radius:6px; padding:4px 0;">
                    <div style="font-size:0.68rem; font-weight:700; color:var(--success); padding:2px 6px; border-bottom:1px solid rgba(16,185,129,0.2);"><i class="fa-solid fa-money-bill-wave"></i> Cash Payments</div>
                    <table style="width:100%; border-collapse:collapse;">${rows}</table>
                    <div style="padding:2px 6px; font-size:0.7rem; display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">Remaining:</span>
                        <span style="font-weight:700; color:${remaining > 0 ? '#ef4444' : 'var(--success)'}">${cSymbol}${remaining.toFixed(2)}</span>
                    </div>
                </div>`;
        }

        // Action Buttons — contextual per status (flex-column stack)
        const btnBase = `padding:4px 8px; font-size:0.72rem; border-radius:6px; border:none; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:600; width:100%; justify-content:flex-start; transition:opacity 0.15s;`;

        let actionButtons = "";
        if (chq.status === "pending" || chq.status === "postponed") {
            actionButtons = `
                <div style="display:flex; flex-direction:column; gap:5px; min-width:110px;">
                    <button style="${btnBase} background:rgba(16,185,129,0.18); color:var(--success);" onclick="markChequeCleared('${chq.id}')">
                        <i class="fa-solid fa-circle-check"></i> Clear
                    </button>
                    <button style="${btnBase} background:rgba(59,130,246,0.18); color:#60a5fa;" onclick="putChequeOnHold('${chq.id}')">
                        <i class="fa-solid fa-circle-pause"></i> Hold
                    </button>
                    <button style="${btnBase} background:rgba(245,158,11,0.18); color:var(--amber-500);" onclick="openRescheduleModal('${chq.id}')">
                        <i class="fa-solid fa-calendar-days"></i> Reschedule
                    </button>
                    <button style="${btnBase} background:rgba(239,68,68,0.18); color:#f87171;" onclick="bounceCheque('${chq.id}')">
                        <i class="fa-solid fa-triangle-exclamation"></i> Bounce
                    </button>
                </div>
            `;
        } else if (chq.status === "hold") {
            actionButtons = `
                <div style="display:flex; flex-direction:column; gap:5px; min-width:110px;">
                    <button style="${btnBase} background:rgba(16,185,129,0.18); color:var(--success);" onclick="markChequeCleared('${chq.id}')">
                        <i class="fa-solid fa-circle-check"></i> Clear
                    </button>
                    <button style="${btnBase} background:rgba(168,85,247,0.18); color:var(--purple-500);" onclick="releaseCheque('${chq.id}')">
                        <i class="fa-solid fa-play"></i> Release
                    </button>
                    <button style="${btnBase} background:rgba(245,158,11,0.18); color:var(--amber-500);" onclick="openRescheduleModal('${chq.id}')">
                        <i class="fa-solid fa-calendar-days"></i> Reschedule
                    </button>
                    <button style="${btnBase} background:rgba(239,68,68,0.18); color:#f87171;" onclick="bounceCheque('${chq.id}')">
                        <i class="fa-solid fa-triangle-exclamation"></i> Bounce
                    </button>
                </div>
            `;
        } else if (chq.status === "bounced") {
            actionButtons = `
                <div style="display:flex; flex-direction:column; gap:5px; min-width:110px;">
                    <button style="${btnBase} background:rgba(16,185,129,0.18); color:var(--success);" onclick="openSettleReturnedChequeModal('${chq.id}')">
                        <i class="fa-solid fa-money-bill-wave"></i> Settle Cash
                    </button>
                    <button style="${btnBase} background:rgba(245,158,11,0.18); color:var(--amber-500);" onclick="openRescheduleModal('${chq.id}')">
                        <i class="fa-solid fa-calendar-rotate-left"></i> Re-schedule
                    </button>
                </div>
            `;
        } else {
            actionButtons = `<span style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-lock"></i> Locked</span>`;
        }

        // Format dates
        const fmtRecDate = chq.receivedDate ? new Date(chq.receivedDate).toLocaleDateString() : "-";
        const fmtDepDate = chq.depositDate ? new Date(chq.depositDate).toLocaleDateString() : "-";
        const fmtEmergDate = chq.emergencyRequestDate ? `<div style="font-size:0.7rem; color:var(--amber-500); font-weight:600; margin-top:2px;"><i class="fa-solid fa-clock"></i> Rescheduled: ${new Date(chq.emergencyRequestDate).toLocaleDateString()}</div>` : "";

        // Resolve salesman dynamically
        const salesman = chq.salesman || (state.customers.find(c => c.id === chq.customer?.id)?.salesman || "Shemal");
        const salesmanDisplay = "Mr. " + salesman;

        return `
            <tr>
                <td><strong>${chq.chequeNumber}</strong></td>
                <td>
                    <span class="product-cell-name" style="font-weight:600; display:block;">${chq.customer?.companyName || chq.customer?.name}</span>
                    <span style="font-size:0.7rem; color:var(--text-muted);">Salesman: ${salesmanDisplay}</span>
                </td>
                <td>
                    <div style="font-weight:600; font-size:0.8rem;">${chq.bankName}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${chq.branchName}</div>
                </td>
                <td style="font-weight:700; color:var(--text-main);">
                    ${cSymbol}${chq.amount.toFixed(2)}
                    ${cashHistoryHtml}
                </td>
                <td style="font-size:0.8rem;">${fmtRecDate}</td>
                <td>
                    <div style="font-size:0.8rem;">${fmtDepDate}</div>
                    ${fmtEmergDate}
                </td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td style="width:130px; vertical-align:middle; padding: 10px 8px;">${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

function markChequeCleared(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    cheque.status = "cleared";
    saveStateToServer();
    refreshAllViews();
    triggerNotification("success", "Cheque Cleared", `Cheque ${cheque.chequeNumber} of ${state.settings.currency}${cheque.amount.toFixed(2)} cleared successfully.`);
    alert("Cheque marked as cleared and deposited successfully!");
}

// ----------------------------------------------------------
// Hold & Release
// ----------------------------------------------------------
function putChequeOnHold(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    cheque.status = "hold";
    saveStateToServer();
    refreshAllViews();
    triggerNotification("info", "Cheque On Hold", `Cheque ${cheque.chequeNumber} has been placed on hold.`);
}

function releaseCheque(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    // If there is an emergency date, restore to postponed; otherwise pending
    cheque.status = cheque.emergencyRequestDate ? "postponed" : "pending";
    saveStateToServer();
    refreshAllViews();
    triggerNotification("success", "Cheque Released", `Cheque ${cheque.chequeNumber} has been released back to active status.`);
}

// ----------------------------------------------------------
// Cash Settlement for Bounced Cheques
// ----------------------------------------------------------
function openSettleReturnedChequeModal(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    const modal = document.getElementById("modal-settle-returned-cheque");
    if (!modal) return;

    const cashPaid = (cheque.cashPayments || []).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, cheque.amount - cashPaid);
    const sym = state.settings.currency;

    document.getElementById("settle-cheque-id").value = cheque.id;
    document.getElementById("settle-cheque-number").value = cheque.chequeNumber;
    document.getElementById("settle-cheque-company").value = cheque.customer?.companyName || cheque.customer?.name || "";
    document.getElementById("settle-cheque-amount").value = `${sym}${cheque.amount.toFixed(2)}`;
    document.getElementById("settle-cheque-cash-paid").value = `${sym}${cashPaid.toFixed(2)}`;
    document.getElementById("settle-cheque-remaining").value = `${sym}${remaining.toFixed(2)}`;

    // Default payment date to today
    const todayStr = new Date().toISOString().substring(0, 10);
    document.getElementById("settle-cash-date").value = todayStr;
    document.getElementById("settle-cash-amount").value = "";

    modal.classList.add("active");
}

function closeSettleReturnedChequeModal() {
    const modal = document.getElementById("modal-settle-returned-cheque");
    if (modal) modal.classList.remove("active");
}

function saveSettleReturnedCheque() {
    const chequeId = document.getElementById("settle-cheque-id").value;
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    const inputAmount = parseFloat(document.getElementById("settle-cash-amount").value) || 0;
    const paymentDate = document.getElementById("settle-cash-date").value;

    if (inputAmount <= 0) {
        alert("Please enter a valid cash amount.");
        return;
    }
    if (!paymentDate) {
        alert("Please select a payment date.");
        return;
    }

    // Validate against remaining
    const cashPaidSoFar = (cheque.cashPayments || []).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, cheque.amount - cashPaidSoFar);

    if (inputAmount > remaining + 0.001) {
        alert(`The settlement amount (${state.settings.currency}${inputAmount.toFixed(2)}) cannot exceed the remaining balance (${state.settings.currency}${remaining.toFixed(2)}).`);
        return;
    }

    const actualPayment = Math.min(inputAmount, remaining);

    // Record installment
    if (!cheque.cashPayments) cheque.cashPayments = [];
    cheque.cashPayments.push({ amount: actualPayment, date: paymentDate });

    // Reduce customer outstanding debt
    const cust = state.customers.find(c => c.id === cheque.customer.id);
    if (cust) {
        cust.outstandingDebt = Math.max(0, (cust.outstandingDebt || 0) - actualPayment);
    }

    // Reconcile invoices â€” specific invoice first, then FIFO
    let leftover = actualPayment;
    if (cheque.invoiceId) {
        const tx = state.wholesaleTransactions.find(t => t.id === cheque.invoiceId);
        if (tx && tx.outstandingBalance > 0) {
            const apply = Math.min(leftover, tx.outstandingBalance);
            tx.outstandingBalance = Math.max(0, tx.outstandingBalance - apply);
            tx.amountPaid = (tx.amountPaid || 0) + apply;
            if (tx.outstandingBalance === 0) tx.status = "paid";
            leftover -= apply;
        }
    }
    if (leftover > 0) {
        const unpaidTxs = state.wholesaleTransactions
            .filter(tx => tx.customer?.id === cheque.customer.id && tx.status !== "paid" && tx.outstandingBalance > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let tx of unpaidTxs) {
            if (leftover <= 0) break;
            const apply = Math.min(leftover, tx.outstandingBalance);
            tx.outstandingBalance = Math.max(0, tx.outstandingBalance - apply);
            tx.amountPaid = (tx.amountPaid || 0) + apply;
            if (tx.outstandingBalance === 0) tx.status = "paid";
            leftover -= apply;
        }
    }

    // Check if fully settled
    const newCashPaid = (cheque.cashPayments || []).reduce((s, p) => s + p.amount, 0);
    const newRemaining = Math.max(0, cheque.amount - newCashPaid);
    if (newRemaining < 0.01) {
        cheque.status = "cleared";
        triggerNotification("success", "Cheque Fully Settled!", `Cheque ${cheque.chequeNumber} has been fully settled via cash. Status updated to Cleared.`);
    } else {
        triggerNotification("success", "Cash Payment Recorded", `${state.settings.currency}${actualPayment.toFixed(2)} cash payment recorded for cheque ${cheque.chequeNumber}. Remaining: ${state.settings.currency}${newRemaining.toFixed(2)}.`);
    }

    saveStateToServer();
    closeSettleReturnedChequeModal();
    refreshAllViews();
}

function bounceCheque(chequeId) {
    const cheque = state.cheques.find(c => c.id === chequeId);
    if (!cheque) return;

    if (!confirm(`Are you sure this cheque (${cheque.chequeNumber}) of ${state.settings.currency}${cheque.amount.toFixed(2)} has BOUNCED? This will reinstate this amount back to the customer's outstanding credit debt.`)) {
        return;
    }

    cheque.status = "bounced";

    // Reinstate Customer Outstanding Debt
    const cust = state.customers.find(c => c.id === cheque.customer.id);
    if (cust) {
        cust.outstandingDebt = (cust.outstandingDebt || 0) + cheque.amount;
    }

    // Reinstate Invoice Outstanding Balance
    if (cheque.invoiceId) {
        const tx = state.wholesaleTransactions.find(t => t.id === cheque.invoiceId);
        if (tx) {
            tx.outstandingBalance = (tx.outstandingBalance || 0) + cheque.amount;
            tx.amountPaid = Math.max(0, (tx.amountPaid || 0) - cheque.amount);
            if (tx.outstandingBalance > 0) {
                tx.status = "unpaid";
            }
        }
    }

    saveStateToServer();
    refreshAllViews();
    
    triggerNotification("danger", "Cheque Bounced!", `Cheque ${cheque.chequeNumber} for ${state.settings.currency}${cheque.amount.toFixed(2)} bounced! Debt reinstated for ${cheque.customer.companyName}.`);
    alert("Cheque marked as Bounced. Customer outstanding debt has been reinstated!");
}

// ==========================================================================
// PURCHASE INVOICES MODULE
// ==========================================================================

// In-memory draft invoice items (not persisted until submitted)
let piDraftItems = [];

function initPurchaseInvoiceModule() {
    // Set today's date as default
    const dateInput = document.getElementById("pi-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().substring(0, 10);
    }

    // Product search
    const searchBox = document.getElementById("pi-product-search");
    const dropdown  = document.getElementById("pi-product-dropdown");

    const newItemPanel = document.getElementById("pi-new-item-panel");

    function renderPIDropdown(q) {
        if (!dropdown) return;
        
        let matches = [];
        if (!q) {
            // Show all items (up to 50) when empty
            matches = state.products.slice(0, 50);
            if (newItemPanel) newItemPanel.style.display = "none";
        } else {
            matches = state.products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.sku || "").toLowerCase().includes(q) ||
                (p.category || "").toLowerCase().includes(q)
            ).slice(0, 50);
        }

        if (matches.length === 0) {
            dropdown.style.display = "none";
            if (q && newItemPanel) {
                newItemPanel.style.display = "block";
                document.getElementById("pi-new-item-name").value = q;
            }
        } else {
            if (newItemPanel) newItemPanel.style.display = "none";
            dropdown.innerHTML = matches.map(p => `
                <div data-prod-id="${p.id}" style="padding:9px 14px; cursor:pointer; font-size:0.84rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.04);"
                    onmouseover="this.style.background='rgba(16,185,129,0.1)'" onmouseout="this.style.background=''">
                    <div>
                        <div style="font-weight:600;">${p.name}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${p.sku || ""} ${p.category ? "· " + p.category : ""}</div>
                    </div>
                    <span style="font-size:0.72rem; background:rgba(255,255,255,0.06); border-radius:4px; padding:2px 6px; color:var(--text-muted);">
                        Current Stock: <strong style="color:var(--primary);">${getProductStock(p) ?? 0}</strong>
                    </span>
                </div>`
            ).join('');
            dropdown.style.display = "block";

            dropdown.querySelectorAll("[data-prod-id]").forEach(el => {
                el.addEventListener("mousedown", (e) => {
                    e.preventDefault(); // Prevent focus from leaving search box immediately
                    const prod = state.products.find(p => p.id === el.getAttribute("data-prod-id"));
                    if (prod) {
                        document.getElementById("pi-selected-product-name").value = prod.name;
                        document.getElementById("pi-selected-product-id").value = prod.id;
                        // Pre-fill cost price if available
                        const costInput = document.getElementById("pi-item-cost");
                        if (costInput && prod.costPrice) costInput.value = prod.costPrice;
                        searchBox.value = "";
                        dropdown.style.display = "none";
                        document.getElementById("pi-item-qty").focus();
                    }
                });
            });
        }
    }

    if (searchBox) {
        searchBox.addEventListener("focus", () => {
            renderPIDropdown(searchBox.value.toLowerCase().trim());
        });

        searchBox.addEventListener("input", () => {
            renderPIDropdown(searchBox.value.toLowerCase().trim());
        });

        searchBox.addEventListener("blur", () => {
            setTimeout(() => { if (dropdown) dropdown.style.display = "none"; }, 180);
        });
    }

    // Add New Item to System button
    const addNewItemBtn = document.getElementById("btn-pi-add-new-item");
    if (addNewItemBtn) {
        addNewItemBtn.addEventListener("click", () => {
            const name = document.getElementById("pi-new-item-name").value.trim();
            const category = document.getElementById("pi-new-item-category").value.trim() || "Uncategorized";
            const qty = parseInt(document.getElementById("pi-new-item-qty").value) || 0;
            const cost = parseFloat(document.getElementById("pi-new-item-cost").value) || 0;
            const price = parseFloat(document.getElementById("pi-new-item-price").value) || 0;

            if (!name) { alert("Item Name is required."); return; }
            if (qty <= 0) { alert("Quantity must be at least 1."); return; }

            // Create new product in state
            const newProd = {
                id: "P" + Date.now(),
                name: name,
                category: category,
                price: price,
                costPrice: cost,
                stock: 0, // will be incremented by the invoice submission
                sku: "SKU-" + Math.floor(Math.random() * 9000 + 1000)
            };
            
            state.products.push(newProd);

            // Add to draft invoice items
            piDraftItems.push({
                productId: newProd.id,
                productName: newProd.name,
                qty: qty,
                cost: cost
            });

            // Reset UI
            if (searchBox) searchBox.value = "";
            if (newItemPanel) newItemPanel.style.display = "none";
            document.getElementById("pi-new-item-name").value = "";
            document.getElementById("pi-new-item-category").value = "";
            document.getElementById("pi-new-item-qty").value = "1";
            document.getElementById("pi-new-item-cost").value = "";
            document.getElementById("pi-new-item-price").value = "";

            renderPIDraftTable();
            // Refresh inventory if we are seeing it
            if (state.activeTab === "inventory") renderInventory();
        });
    }

    // Add Item button
    const addBtn = document.getElementById("btn-pi-add-item");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            const productId   = document.getElementById("pi-selected-product-id").value;
            const productName = document.getElementById("pi-selected-product-name").value;
            const qty         = parseInt(document.getElementById("pi-item-qty").value) || 0;
            const cost        = parseFloat(document.getElementById("pi-item-cost").value) || 0;

            if (!productId || !productName) { alert("Please search and select a product first."); return; }
            if (qty <= 0) { alert("Quantity must be at least 1."); return; }

            // Check if already added — merge qty
            const existing = piDraftItems.find(i => i.productId === productId);
            if (existing) {
                existing.qty   += qty;
                existing.cost   = cost; // update cost
            } else {
                piDraftItems.push({ productId, productName, qty, cost });
            }

            // Reset item selectors
            document.getElementById("pi-selected-product-name").value = "";
            document.getElementById("pi-selected-product-id").value   = "";
            document.getElementById("pi-item-qty").value  = "1";
            document.getElementById("pi-item-cost").value = "";

            renderPIDraftTable();
        });
    }

    // Form submit
    const form = document.getElementById("purchase-invoice-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            if (piDraftItems.length === 0) { alert("Please add at least one item to the invoice."); return; }
            const date       = document.getElementById("pi-date").value || new Date().toISOString().substring(0, 10);
            
            // Generate auto invoice number and default supplier since form is simplified
            const companyInvoiceNo = document.getElementById("pi-company-invoice-no")?.value.trim() || ("RCV-" + Date.now().toString().slice(-6));
            const autoSupplier = "General Stock Receiving";

            const grandTotal = piDraftItems.reduce((s, i) => s + i.qty * i.cost, 0);

            // Build invoice record
            const invoice = {
                id:         "PI-" + Date.now(),
                supplier:   autoSupplier,
                invoiceNo:  companyInvoiceNo,
                date:       date,
                notes:      "",
                items:      piDraftItems.map(i => ({ ...i })),
                grandTotal,
                createdAt:  new Date().toISOString()
            };

            // Add to state
            state.purchaseInvoices.unshift(invoice);

            // Update stock quantities for each item
            piDraftItems.forEach(item => {
                const prod = state.products.find(p => p.id === item.productId);
                if (prod) {
                    prod.stock = (prod.stock || 0) + item.qty;
                    if (item.cost > 0) prod.costPrice = item.cost; // update cost price
                }
            });

            saveStateToServer();
            triggerNotification("success", "Stock Received!", `${piDraftItems.length} item(s) added to stock.`);

            // Reset form
            piDraftItems = [];
            form.reset();
            document.getElementById("pi-date").value = new Date().toISOString().substring(0, 10);
            renderPIDraftTable();
            renderPurchaseInvoices();

            // Refresh inventory if open
            if (state.activeTab === "inventory") renderInventory();

            alert(`✅ Stock received successfully!\n${invoice.items.length} item(s) added to inventory.`);
        });
    }

    // History search
    const histSearch = document.getElementById("pi-history-search");
    if (histSearch) {
        histSearch.addEventListener("input", renderPurchaseInvoices);
    }
}

function renderPIDraftTable() {
    const tbody      = document.getElementById("pi-items-tbody");
    const countEl    = document.getElementById("pi-item-count");
    const totalRow   = document.getElementById("pi-total-row");
    const totalEl    = document.getElementById("pi-grand-total");
    const emptyRow   = document.getElementById("pi-empty-row");

    if (!tbody) return;

    if (piDraftItems.length === 0) {
        tbody.innerHTML = `<tr id="pi-empty-row"><td colspan="5" style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.8rem; font-style:italic;">
            <i class="fa-solid fa-box-open" style="font-size:1.5rem; display:block; margin-bottom:6px; opacity:0.4;"></i>Search and add items above</td></tr>`;
        if (countEl) countEl.innerText = "0 items";
        if (totalRow) totalRow.style.display = "none";
        return;
    }

    const cSym = state.settings.currency;
    let grandTotal = 0;

    tbody.innerHTML = piDraftItems.map((item, idx) => {
        const lineTotal = item.qty * item.cost;
        grandTotal += lineTotal;
        const prod = state.products.find(p => p.id === item.productId);
        const currentStock = prod ? (prod.stock || 0) : 0;
        
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.82rem;">
            <td style="padding:8px 10px;">
                <div style="font-weight:600;">${item.productName}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">Stock: <span style="color:var(--text-main);">${currentStock}</span> <i class="fa-solid fa-arrow-right" style="font-size:0.6rem; margin:0 4px;"></i> <strong style="color:var(--success);">${currentStock + item.qty}</strong></div>
            </td>
            <td style="padding:8px 10px; text-align:center;">
                <input type="number" value="${item.qty}" min="1" onchange="piUpdateQty(${idx}, this.value)"
                    style="width:54px; text-align:center; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; padding:2px 4px; color:var(--text-main); font-size:0.82rem;">
            </td>
            <td style="padding:8px 10px; text-align:right; color:var(--text-muted);">${cSym}${item.cost.toFixed(2)}</td>
            <td style="padding:8px 10px; text-align:right; font-weight:700; color:var(--success);">${cSym}${lineTotal.toFixed(2)}</td>
            <td style="padding:8px 4px; text-align:center;">
                <button onclick="piRemoveItem(${idx})" style="background:rgba(239,68,68,0.12); border:none; border-radius:4px; color:#f87171; cursor:pointer; padding:3px 7px; font-size:0.75rem;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    if (countEl) countEl.innerText = `${piDraftItems.length} item${piDraftItems.length > 1 ? "s" : ""}`;
    if (totalRow) totalRow.style.display = "block";
    if (totalEl)  totalEl.innerText = `${cSym}${grandTotal.toFixed(2)}`;
}

function piUpdateQty(idx, val) {
    const qty = parseInt(val);
    if (!isNaN(qty) && qty > 0) piDraftItems[idx].qty = qty;
    renderPIDraftTable();
}

function piRemoveItem(idx) {
    piDraftItems.splice(idx, 1);
    renderPIDraftTable();
}

function renderPurchaseInvoices() {
    const container = document.getElementById("pi-history-list");
    if (!container) return;

    const query = (document.getElementById("pi-history-search")?.value || "").toLowerCase().trim();
    let list = state.purchaseInvoices || [];

    if (query) {
        list = list.filter(inv =>
            inv.supplier.toLowerCase().includes(query) ||
            inv.invoiceNo.toLowerCase().includes(query) ||
            (inv.notes || "").toLowerCase().includes(query)
        );
    }

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.85rem; font-style:italic;">
            <i class="fa-solid fa-inbox" style="font-size:2rem; display:block; margin-bottom:8px; opacity:0.3;"></i>
            ${query ? "No invoices match your search" : "No purchase invoices yet"}
        </div>`;
        return;
    }

    const cSym = state.settings.currency;
    container.innerHTML = list.map(inv => {
        const dateStr = inv.date ? new Date(inv.date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "-";
        const itemRows = (inv.items || []).map(item =>
            `<tr style="font-size:0.76rem; border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:5px 8px; color:var(--text-main);">${item.productName}</td>
                <td style="padding:5px 8px; text-align:center; color:var(--success); font-weight:700;">+${item.qty}</td>
                <td style="padding:5px 8px; text-align:right; color:var(--text-muted);">${cSym}${(item.cost || 0).toFixed(2)}</td>
                <td style="padding:5px 8px; text-align:right; font-weight:600;">${cSym}${(item.qty * (item.cost || 0)).toFixed(2)}</td>
            </tr>`
        ).join('');

        return `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--border-color);">
                <div>
                    <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">
                        <i class="fa-solid fa-building" style="color:var(--primary); margin-right:6px; font-size:0.8rem;"></i>${inv.supplier}
                    </div>
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                        Invoice: <strong style="color:var(--purple-500);">${inv.invoiceNo}</strong>
                        &nbsp;·&nbsp; ${dateStr}
                        ${inv.notes ? `&nbsp;·&nbsp; <em>${inv.notes}</em>` : ""}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; font-size:0.95rem; color:var(--success);">${cSym}${(inv.grandTotal || 0).toFixed(2)}</div>
                    <div style="font-size:0.68rem; color:var(--text-muted);">${inv.items?.length || 0} item(s)</div>
                </div>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:rgba(255,255,255,0.02); font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">
                        <th style="padding:5px 8px; text-align:left;">Product</th>
                        <th style="padding:5px 8px; text-align:center;">Qty Added</th>
                        <th style="padding:5px 8px; text-align:right;">Cost/Unit</th>
                        <th style="padding:5px 8px; text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
        </div>`;
    }).join('');
}

function cancelWholesaleInvoice(invoiceId) {
    if (!confirm("Are you sure you want to Cancel & Return this Wholesale Invoice?\n\nThis will:\n1. Forgive the customer's outstanding balance for this invoice.\n2. Add the items back to the inventory stock.\n3. Remove this sale from your revenue dashboard.\n\nThis action cannot be undone.")) return;

    const tx = state.wholesaleTransactions.find(t => t.id === invoiceId);
    if (!tx || tx.status === "returned") return;

    // Restore stock
    if (tx.items) {
        tx.items.forEach(item => {
            const prod = state.products.find(p => p.id === item.id);
            if (prod) {
                prod.stock = (prod.stock || 0) + item.qty;
            }
        });
    }

    // Adjust customer debt
    if (tx.customer && tx.customer.id && tx.outstandingBalance > 0) {
        const cust = state.customers.find(c => c.id === tx.customer.id);
        if (cust) {
            cust.outstandingDebt = Math.max(0, (cust.outstandingDebt || 0) - tx.outstandingBalance);
        }
    }

    // Update Transaction State
    tx.status = "returned";
    tx.outstandingBalance = 0;
    // Zero out financials so dashboard doesn't count it
    tx.grandTotal = 0;
    tx.profit = 0;
    tx.amountPaid = 0;

    saveStateToServer();
    refreshAllViews();

    triggerNotification("warning", "Invoice Returned", `Invoice ${invoiceId} has been cancelled. Stock has been restored.`);
    alert(`✅ Invoice ${invoiceId} successfully cancelled!\nItems returned to stock.`);
}

// --------------------------------------------------------------------------
// 16. Expenses & Advances Controller
// --------------------------------------------------------------------------
function renderExpensesTab() {
    state.expenses = state.expenses || [];
    state.employees = state.employees || [];

    // Calculate Totals
    let totalShop = 0;
    let totalEmp = 0;
    state.expenses.forEach(exp => {
        if (exp.category === 'shop') totalShop += exp.amount;
        if (exp.category === 'employee') totalEmp += exp.amount;
    });

    const statShop = document.getElementById("expenses-stat-shop");
    const statEmp = document.getElementById("expenses-stat-employee");
    if(statShop) statShop.innerText = `${state.settings.currency}${totalShop.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if(statEmp) statEmp.innerText = `${state.settings.currency}${totalEmp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // Populate Employee Select
    const empSelect = document.getElementById("expense-employee");
    if (empSelect) {
        empSelect.innerHTML = `<option value="">-- Select Person --</option>` + state.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('');
    }

    // Show/hide Employee Summary Card
    const empCard = document.getElementById("employees-summary-card");
    if (empCard) {
        empCard.style.display = state.employees.length > 0 ? "block" : "none";
    }

    // Populate Employees Table
    const empTbody = document.getElementById("employees-tbody");
    if (empTbody) {
        empTbody.innerHTML = state.employees.map(emp => {
            const totalTaken = state.expenses.filter(e => e.category === 'employee' && e.personId === emp.id).reduce((sum, e) => sum + e.amount, 0);
            return `
                <tr>
                    <td style="font-weight: 500;">${emp.name}</td>
                    <td style="text-align:right; font-weight: 600; color: var(--amber-500);">${state.settings.currency}${totalTaken.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align:right;">
                        <button class="btn btn-outline-danger btn-xs" onclick="deleteEmployee('${emp.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Populate Expenses History
    const historyTbody = document.getElementById("expenses-history-tbody");
    if (historyTbody) {
        if (state.expenses.length === 0) {
            historyTbody.innerHTML = `<tr><td colspan="4" class="empty-state">No expenses recorded yet.</td></tr>`;
        } else {
            const sortedExp = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            historyTbody.innerHTML = sortedExp.map(exp => {
                const isShop = exp.category === 'shop';
                let reasonHtml = exp.reason;
                if (!isShop && exp.personId) {
                    const emp = state.employees.find(e => e.id === exp.personId);
                    if (emp) reasonHtml += ` <span class="badge badge-secondary" style="font-size:0.65rem;">${emp.name}</span>`;
                }
                return `
                    <tr>
                        <td>${new Date(exp.date).toLocaleDateString()}</td>
                        <td>${isShop ? '<span class="badge" style="background:var(--danger); color:white;">Shop</span>' : '<span class="badge" style="background:var(--amber-500); color:white;">Employee</span>'}</td>
                        <td>${reasonHtml}</td>
                        <td style="text-align:right; font-weight:600;">${state.settings.currency}${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style="text-align:right;">
                            <button class="btn btn-outline-danger btn-xs" onclick="deleteSingleExpense('${exp.id}')" title="Delete Expense"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function openAddEmployeeModal() {
    document.getElementById("form-add-employee")?.reset();
    document.getElementById("modal-add-employee")?.classList.add("active");
}

function closeAddEmployeeModal() {
    document.getElementById("modal-add-employee")?.classList.remove("active");
}

async function deleteEmployee(empId) {
    if(await confirmAction("Are you sure you want to delete this person? Their past expenses will remain in the log but won't be linked to them.", true)) {
        const pass = await promptOwnerPassword("Enter Owner Password to delete this person:");
        if (pass === null) return;
        const currentOwnerPass = state.settings.ownerPassword || "admin123";
        if (pass === currentOwnerPass) {
            state.employees = state.employees.filter(e => e.id !== empId);
            saveStateToServer();
            renderExpensesTab();
        } else if (pass !== null) {
            alert("Incorrect password. Action cancelled.");
        }
    }
}

async function clearExpensesHistory() {
    if(await confirmAction("WARNING: This will permanently delete all expense logs. Total balances will be reset. Are you absolutely sure?", true)) {
        const pass = await promptOwnerPassword("Enter Owner Password to clear expenses:");
        if (pass === null) return;
        const currentOwnerPass = state.settings.ownerPassword || "admin123";
        if (pass === currentOwnerPass) {
            state.expenses = [];
            saveStateToServer();
            renderExpensesTab();
            refreshAllViews();
        } else if (pass !== null) {
            alert("Incorrect password. Action cancelled.");
        }
    }
}

async function deleteSingleExpense(expId) {
    if(await confirmAction("Are you sure you want to delete this specific expense record?", true)) {
        const pass = await promptOwnerPassword("Enter Owner Password to delete this expense:");
        if (pass === null) return;
        const currentOwnerPass = state.settings.ownerPassword || "admin123";
        if (pass === currentOwnerPass) {
            state.expenses = state.expenses.filter(e => e.id !== expId);
            saveStateToServer();
            renderExpensesTab();
            refreshAllViews();
        } else if (pass !== null) {
            alert("Incorrect password. Action cancelled.");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Toggle Employee Dropdown
    document.getElementById("expense-category")?.addEventListener("change", (e) => {
        const isEmp = e.target.value === "employee";
        const empGroup = document.getElementById("expense-employee-group");
        const empSelect = document.getElementById("expense-employee");
        if (empGroup && empSelect) {
            empGroup.style.display = isEmp ? "block" : "none";
            empSelect.required = isEmp;
        }
    });

    // Add New Expense
    document.getElementById("form-add-expense")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const category = document.getElementById("expense-category").value;
        const amount = parseFloat(document.getElementById("expense-amount").value);
        const reason = document.getElementById("expense-reason").value;
        const date = document.getElementById("expense-date").value || new Date().toISOString();
        let personId = null;

        if (category === "employee") {
            personId = document.getElementById("expense-employee").value;
            if (!personId) {
                alert("Please select a person.");
                return;
            }
        }

        state.expenses = state.expenses || [];
        state.expenses.unshift({
            id: "EXP-" + Date.now(),
            category,
            amount,
            reason,
            date,
            personId
        });

        saveStateToServer();
        refreshAllViews();
        e.target.reset();
        
        const empGroup = document.getElementById("expense-employee-group");
        if(empGroup) empGroup.style.display = "none";
        
        triggerNotification("success", "Expense Logged", `Recorded ${state.settings.currency}${amount} for ${reason}`);
    });

    // Add New Employee
    document.getElementById("form-add-employee")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("employee-name").value;
        state.employees = state.employees || [];
        state.employees.push({
            id: "EMP-" + Date.now(),
            name: name
        });
        saveStateToServer();
        closeAddEmployeeModal();
        renderExpensesTab();
        triggerNotification("success", "Person Added", `${name} added successfully.`);
    });

    document.getElementById("form-manual-credit")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const custId = document.getElementById("mc-customer").value;
        const amount = parseFloat(document.getElementById("mc-amount").value);
        const note = document.getElementById("mc-note").value.trim() || "Manual Cash/Credit Entry";
        const dateInput = document.getElementById("mc-date").value;

        if (!custId || isNaN(amount) || amount <= 0 || !dateInput) return;

        const customer = state.customers.find(c => c.id === custId);
        if (!customer) return;

        // Create a dummy wholesale transaction to register the debt
        const newDebtId = `MC-${Date.now()}`;
        
        // Ensure the timestamp includes the correct time or at least format as ISO
        let transactionDate = new Date(dateInput);
        if (isNaN(transactionDate.getTime())) {
            transactionDate = new Date();
        }

        state.wholesaleTransactions.push({
            id: newDebtId,
            timestamp: transactionDate.toISOString(),
            customer: { id: customer.id, name: customer.companyName || customer.name },
            paymentMethod: "store-credit",
            billingTerms: "Manual Credit Issue",
            status: "unpaid",
            subtotal: amount,
            grandTotal: amount,
            outstandingBalance: amount,
            paymentHistory: [],
            items: [{ name: note, qty: 1, sellingPrice: amount, costPrice: 0, total: amount }],
            profit: 0
        });

        // Update customer debt
        customer.outstandingDebt = (customer.outstandingDebt || 0) + amount;
        
        // Also ensure they appear in the cash-credit tab if they didn't before
        if (customer.accountType !== "credit" && customer.accountType !== "cash-credit") {
            customer.accountType = "cash-credit"; 
        }

        saveStateToServer();
        closeManualCreditModal();
        renderCashCreditTab();
        triggerNotification("success", "Credit Issued", `Added ${state.settings.currency}${amount.toFixed(2)} debt to ${customer.name}.`);
    });
});

// --------------------------------------------------------------------------
// 17. Security & Passwords
// --------------------------------------------------------------------------
function openPasswordsModal() {
    document.getElementById("modal-passwords").classList.add("active");
}

function closePasswordsModal() {
    document.getElementById("modal-passwords").classList.remove("active");
}

async function changeSystemPassword() {
    const pwdInput = document.getElementById("system-pwd-input");
    const newPwd = pwdInput.value.trim();

    if (newPwd.length < 3) {
        alert("Password must be at least 3 characters long.");
        return;
    }

    // Verify current owner password before changing
    const check = await promptOwnerPassword("Enter Dashboard Login Password to verify this change:");
    if (check === null) return;
    
    if (check === state.settings.ownerPassword) {
        state.settings.systemPassword = newPwd;
        saveStateToServer();
        alert("Main System Login Password updated successfully!");
        pwdInput.value = "";
    } else {
        alert("Incorrect Owner password! Action denied.");
    }
}

async function changeOwnerPassword() {
    const pwdInput = document.getElementById("owner-pwd-input");
    const newPwd = pwdInput.value.trim();

    if (newPwd.length < 3) {
        alert("Password must be at least 3 characters long.");
        return;
    }

    // Verify current owner password before changing
    const check = await promptOwnerPassword("Enter CURRENT Owner Password to verify:");
    if (check === null) return;

    if (check === state.settings.ownerPassword) {
        state.settings.ownerPassword = newPwd;
        saveStateToServer();
        alert("Owner Password updated successfully!");
        pwdInput.value = "";
    } else {
        alert("Incorrect current password! Action denied.");
    }
}
