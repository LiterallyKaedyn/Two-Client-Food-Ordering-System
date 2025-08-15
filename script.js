// script.js - Enhanced Food Ordering System with Real-time Updates via SSE
// Food options configuration at the top for easy editing

// ========== ENHANCED FOOD OPTIONS CONFIGURATION ==========

// Easy-to-edit food configuration
const FOOD_OPTIONS = {
    // Breakfast items
    'Up and Go': {
        type: 'single',
        label: 'Flavor',
        options: ['Chocolate', 'Vanilla', 'Strawberry']
    },
    'Cornflakes': {
        type: 'single',
        label: 'Additions',
        options: ['With Milk', 'With Sugar', 'With Milk and Sugar']
    },
    'Coco Pops': {
        type: 'single',
        label: 'Additions',
        options: ['With Milk', 'With Sugar', 'With Milk and Sugar']
    },
    // Wraps - THIS IS THE KEY ONE WITH MULTI-SECTION
    'Chicken Wrap': {
        type: 'multiSection',
        sections: [
            {
                label: 'Inside (select at least 2)',
                id: 'inside',
                required: true,
                minRequired: 2,
                options: ['Crumbed Chicken Tenders', 'Lettuce', 'Tomato', 'Coleslaw', 'Cheese', 'Mayo', 'Sweet Chilli Sauce']
            },
            {
                label: 'Additional Options (optional)',
                id: 'additional',
                required: false,
                minRequired: 0,
                options: ['Toasted']
            }
        ]
    },
    // Bean Nachos
    'Bean Nachos': {
        type: 'multiSection',
        sections: [
            {
                label: 'Inside',
                id: 'inside',
                required: false,
                minRequired: 0,
                options: ['Corn Chips', 'Sour Cream', 'Cheese']
            },
            {
                label: 'Additional Options (optional)',
                id: 'additional',
                required: false,
                minRequired: 0,
                options: ['Salad', 'Coleslaw']
            }
        ]
    },
    // Loaded Fries
    'Loaded Fries': {
        type: 'multiSection',
        sections: [
            {
                label: 'Inside',
                id: 'inside',
                required: false,
                minRequired: 0,
                options: ['Sweet Chilli Sauce', 'Cheese', 'Sour Cream', 'Nacho Mix']
            },
            {
                label: 'Additional Options (optional)',
                id: 'additional',
                required: false,
                minRequired: 0,
                options: ['Salad Coleslaw']
            }
        ]
    },
    // Hot Beverages with sugar selector, milk option, and cup questions
    'Hot Chocolate': {
        type: 'beverageCustom',
        sections: [
            {
                label: 'Sugar (teaspoons)',
                id: 'sugar',
                type: 'counter',
                min: 0,
                max: 6,
                default: 2
            },
            {
                label: 'Milk',
                id: 'milk',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'Yes'
            },
            {
                label: 'Do you have a cup?',
                id: 'hasCup',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'No'
            },
            {
                label: 'Where is your cup?',
                id: 'cupLocation',
                type: 'conditional',
                dependsOn: 'hasCup',
                showWhen: 'Yes',
                options: ['With me', 'In the kitchen'],
                default: 'With me'
            }
        ]
    },
    'Cappuccino': {
        type: 'beverageCustom',
        sections: [
            {
                label: 'Sugar (teaspoons)',
                id: 'sugar',
                type: 'counter',
                min: 0,
                max: 6,
                default: 1
            },
            {
                label: 'Milk',
                id: 'milk',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'Yes'
            },
            {
                label: 'Do you have a cup?',
                id: 'hasCup',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'No'
            },
            {
                label: 'Where is your cup?',
                id: 'cupLocation',
                type: 'conditional',
                dependsOn: 'hasCup',
                showWhen: 'Yes',
                options: ['With me', 'In the kitchen'],
                default: 'With me'
            }
        ]
    },
    'Tea': {
        type: 'beverageCustom',
        sections: [
            {
                label: 'Sugar (teaspoons)',
                id: 'sugar',
                type: 'counter',
                min: 0,
                max: 6,
                default: 1
            },
            {
                label: 'Milk',
                id: 'milk',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'Yes'
            },
            {
                label: 'Do you have a cup?',
                id: 'hasCup',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'No'
            },
            {
                label: 'Where is your cup?',
                id: 'cupLocation',
                type: 'conditional',
                dependsOn: 'hasCup',
                showWhen: 'Yes',
                options: ['With me', 'In the kitchen'],
                default: 'With me'
            }
        ]
    },
    // Water - with cup questions only
    'Water': {
        type: 'beverageCustom',
        sections: [
            {
                label: 'Do you have a cup?',
                id: 'hasCup',
                type: 'boolean',
                options: ['Yes', 'No'],
                default: 'No'
            },
            {
                label: 'Where is your cup?',
                id: 'cupLocation',
                type: 'conditional',
                dependsOn: 'hasCup',
                showWhen: 'Yes',
                options: ['With me', 'In the kitchen'],
                default: 'With me'
            }
        ]
    },
    // Ice Cream
    'Ice Cream Cone': {
        type: 'single',
        label: 'Type',
        options: ['Cone']
    },
    'Fruit Salad': {
        type: 'single',
        label: 'Size',
        options: ['Regular', 'Large']
    },
    // Extras - No options needed for these
    'Ice Blocks': null,
    'Up and Go Extra': null,
    'Muesli Bars': null,
    'Mince and Cheese Pies': null,
    'Vegan Pies': null
};

// ========== MAIN APPLICATION ==========

(function() {
    'use strict';
    
    // ========== AUTHENTICATION SYSTEM ==========
    
    // Obfuscated authentication data
    const AUTH_CONFIG = {
        // Base64 encoded
        key: 'S2FlZHluSXNDb29s',
        salt: 'food_mgr_2025',
        sessionKey: 'manager_session_v2'
    };
    
    // Session management constants
    const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
    const ACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour inactivity
    
    // Decode authentication key
    function getAuthKey() {
        try {
            return atob(AUTH_CONFIG.key);
        } catch (e) {
            return null;
        }
    }

    function showNewOrderNotification(orderCount = 1) {
        const notification = document.getElementById('newOrderNotification');
        if (notification) {
            // Enhanced notification text with sound status
            const soundStatus = userHasInteracted ? '🔔' : '🔇';
            notification.innerHTML = `${soundStatus} ${orderCount} new order${orderCount > 1 ? 's' : ''} received!`;
            notification.style.display = 'block';
            notification.style.animation = 'pulse 1s infinite';
            notification.style.backgroundColor = '#28A745';
            notification.style.border = '3px solid #000';
            notification.style.fontWeight = '700';
            
            // Add click to test sound if user hasn't interacted yet
            if (!userHasInteracted) {
                notification.style.cursor = 'pointer';
                notification.title = 'Click to enable sound notifications';
                notification.onclick = function() {
                    enableAudioAfterUserGesture();
                    playNewOrderSound(); // Test the sound
                    this.onclick = null; // Remove click handler
                    this.style.cursor = 'default';
                    this.title = '';
                };
            }
            
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.animation = '';
                notification.onclick = null;
                notification.style.cursor = 'default';
            }, 8000); // Show for 8 seconds
        }
    }

    async function showPage(pageName) {
        // Close existing real-time connection when changing pages
        closeRealTimeConnection();
        
        // Stop fallback polling
        stopEventDrivenUpdates();
        
        // Manager portal authentication
        if (pageName === 'manager') {
            const authenticated = await authenticateManager();
            if (!authenticated) {
                debugLog('[MANAGER ACCESS] Authentication failed');
                window.location.href = window.location.pathname;
                return;
            }
            debugLog('[MANAGER ACCESS] Authentication successful');
        }
        
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        if (pageName === 'manager') {
            document.getElementById('managerPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering - Manage Active Orders';
            loadOrders();
            checkKitchenStatus();
            loadRecentOrders();
            setupRealTimeUpdates(); // Real-time updates for manager
        } else if (pageName === 'tracking') {
            document.getElementById('trackingPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering - Track Your Order';
            loadOrderTracking();
            loadRecentOrders();
            setupRealTimeUpdates(); // Real-time updates for tracking
        } else {
            document.getElementById('orderPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering';
            checkKitchenStatus();
            loadRecentOrders();
            setupRealTimeUpdates(); // Real-time updates for order page
        }
    }

    function logoutManager() {
        if (confirm('Are you sure you want to logout?')) {
            clearSession();
            showMessage('success', 'Logged out successfully. Redirecting...');
            setTimeout(() => {
                window.location.href = window.location.pathname;
            }, 1500);
        }
    }

    // Manager functions
    async function loadOrders() {
        const loading = document.getElementById('loading');
        const container = document.getElementById('ordersContainer');
        const noOrdersMsg = document.getElementById('noOrders');
        
        if (loading) loading.style.display = 'block';
        if (container) container.innerHTML = '';
        if (noOrdersMsg) noOrdersMsg.style.display = 'none';
        
        try {
            const response = await getOrders();
            const orders = response.orders || [];
            
            if (loading) loading.style.display = 'none';
            lastOrderCount = orders.length;
            
            if (orders.length === 0) {
                if (noOrdersMsg) noOrdersMsg.style.display = 'block';
            } else if (container) {
                container.innerHTML = orders.map((order) => `
                    <div class="order-card" data-order-id="${order.id}">
                        <h3>Order #${order.id}</h3>
                        <div class="order-info">
                            <strong>Food:</strong> ${order.food}<br>
                            <strong>Room:</strong> ${order.room}<br>
                            <strong>Name:</strong> ${order.name}<br>
                            ${order.comments ? `<strong>Comments:</strong> ${order.comments}<br>` : ''}
                            <strong>Time:</strong> ${order.timestamp}<br>
                            <span class="status-badge status-${order.status}">${order.status.replace(/-/g, ' ')}</span>
                        </div>
                        <div class="status-controls">
                            ${order.status === 'pending' ? `
                                <button class="status-btn" data-order-id="${order.id}" data-status="accepted" type="button">Accept</button>
                                <button class="delete-btn" data-order-id="${order.id}" type="button">Delete</button>
                            ` : ''}
                            ${order.status === 'accepted' ? `
                                <button class="status-btn" data-order-id="${order.id}" data-status="being-made" type="button">Start Making</button>
                                <button class="delete-btn" data-order-id="${order.id}" type="button">Delete</button>
                            ` : ''}
                            ${order.status === 'being-made' ? `
                                <button class="status-btn" data-order-id="${order.id}" data-status="being-delivered" type="button">Out for Delivery</button>
                                <button class="delete-btn" data-order-id="${order.id}" type="button">Delete</button>
                            ` : ''}
                            ${order.status === 'being-delivered' ? `
                                <button class="status-btn" data-order-id="${order.id}" data-status="completed" type="button">Complete</button>
                                <button class="delete-btn" data-order-id="${order.id}" type="button">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
                
                // Add event listeners
                const statusButtons = container.querySelectorAll('.status-btn');
                statusButtons.forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const orderId = this.getAttribute('data-order-id');
                        const newStatus = this.getAttribute('data-status');
                        
                        debugLog(`[Button Click] Order: ${orderId}, New Status: ${newStatus}`);
                        
                        if (orderId && newStatus) {
                            updateStatus(orderId, newStatus);
                        }
                    });
                });

                const deleteButtons = container.querySelectorAll('.delete-btn');
                deleteButtons.forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const orderId = this.getAttribute('data-order-id');
                        
                        debugLog(`[Delete Button Click] Order: ${orderId}`);
                        
                        if (orderId) {
                            deleteOrder(orderId);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Load orders error:', error.message);
            if (loading) loading.style.display = 'none';
            if (container) container.innerHTML = '<div class="error-message" style="display: block;">Failed to load orders. Please refresh.</div>';
        }
    }

    async function updateStatus(orderId, newStatus) {
        try {
            debugLog(`[UPDATE STATUS] Starting update for Order ${orderId} to ${newStatus}`);
            
            const buttons = document.querySelectorAll('.status-btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.textContent = 'Updating...';
            });
            
            const result = await updateOrderStatus(orderId, newStatus);
            debugLog(`[UPDATE STATUS] Success:`, result);
            
            showMessage('success', `Order #${orderId} updated to ${newStatus.replace(/-/g, ' ')}`);
            
            // Force immediate refresh after successful update
            setTimeout(() => {
                loadOrders();
                loadRecentOrders();
            }, 500);
            
            debugLog(`[UPDATE STATUS] Status update completed - forced UI refresh`);
            
        } catch (error) {
            debugLog('[UPDATE STATUS] Error:', error);
            showMessage('error', 'Failed to update order status: ' + error.message);
            
            const buttons = document.querySelectorAll('.status-btn');
            buttons.forEach(btn => {
                btn.disabled = false;
                const status = btn.getAttribute('data-status');
                switch(status) {
                    case 'accepted': btn.textContent = 'Accept'; break;
                    case 'being-made': btn.textContent = 'Start Making'; break;
                    case 'being-delivered': btn.textContent = 'Out for Delivery'; break;
                    case 'completed': btn.textContent = 'Complete'; break;
                }
            });
        }
    }

    async function clearAllOrders() {
        if (!confirm('Are you sure you want to clear ALL orders? This will move all active orders to completed status.')) {
            return;
        }
        
        try {
            await clearOrders();
            showMessage('success', 'All orders cleared');
            
            // Force immediate refresh after clearing
            setTimeout(() => {
                loadOrders();
                loadRecentOrders();
            }, 500);
            
            debugLog(`[CLEAR ORDERS] All orders cleared - forced UI refresh`);
            
        } catch (error) {
            console.error('Clear orders error:', error.message);
            showMessage('error', 'Failed to clear orders. Please try again.');
        }
    }

    // Order tracking functions
    async function loadOrderTracking() {
        const orderId = getOrderIdFromUrl();
        if (!orderId) return;

        const trackingOrderId = document.getElementById('trackingOrderId');
        const trackingOrderDetails = document.getElementById('trackingOrderDetails');

        if (trackingOrderId) trackingOrderId.textContent = `#${orderId}`;

        try {
            const response = await getOrder(orderId);
            const order = response.order;

            if (!order) {
                if (trackingOrderDetails) {
                    trackingOrderDetails.innerHTML = `
                        <div class="error-message" style="display: block;">
                            Order not found. It may have been completed or cancelled.
                        </div>
                    `;
                }
                return;
            }

            if (trackingOrderDetails) {
                trackingOrderDetails.innerHTML = `
                    <h3>${order.food}</h3>
                    <p><strong>Room:</strong> ${order.room}</p>
                    <p><strong>Name:</strong> ${order.name}</p>
                    ${order.comments ? `<p><strong>Comments:</strong> ${order.comments}</p>` : ''}
                    <p><strong>Order Time:</strong> ${order.timestamp}</p>
                    <p><strong>Current Status:</strong> <span class="status-badge status-${order.status}">${order.status.replace(/-/g, ' ')}</span></p>
                    ${order.completedAt ? `<p><strong>Completed At:</strong> ${order.completedAt}</p>` : ''}
                `;
            }

            updateStatusTimeline(order.status);

        } catch (error) {
            console.error('Load order tracking error:', error.message);
            if (trackingOrderDetails) {
                trackingOrderDetails.innerHTML = `
                    <div class="error-message" style="display: block;">
                        Failed to load order details. Please refresh the page.
                    </div>
                `;
            }
        }
    }

    function updateStatusTimeline(currentStatus) {
        const steps = ['pending', 'accepted', 'being-made', 'being-delivered', 'completed'];
        const currentIndex = steps.indexOf(currentStatus);

        document.querySelectorAll('.timeline-step').forEach((step, index) => {
            const circle = step.querySelector('.timeline-circle');
            step.classList.remove('active', 'completed');
            
            if (index < currentIndex) {
                step.classList.add('completed');
            } else if (index === currentIndex) {
                step.classList.add('active');
            }
        });
    }

    // Recent orders functions
    async function loadRecentOrders() {
        const recentContainer = document.getElementById('completedOrdersList');
        if (!recentContainer) return;

        try {
            const response = await getRecentOrders();
            const recentOrders = response.orders || [];

            if (recentOrders.length === 0) {
                recentContainer.innerHTML = '<p style="color: #666; text-align: center;">No orders yet.</p>';
            } else {
                recentContainer.innerHTML = recentOrders
                    .map(order => `
                        <div class="completed-order ${order.isActive ? 'active-order' : ''}">
                            <h4>Order #${order.id}</h4>
                            <p><strong>Food:</strong> ${order.food}</p>
                            <p><strong>Customer:</strong> ${order.name}</p>
                            <p><strong>Room:</strong> ${order.room}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${order.status}" style="display: inline; padding: 2px 8px; font-size: 0.8em;">${order.status.replace(/-/g, ' ')}</span></p>
                            <p><strong>Time:</strong> ${order.timestamp}</p>
                            ${order.completedAt ? `<p><strong>Completed:</strong> ${order.completedAt}</p>` : ''}
                        </div>
                    `).join('');
            }
        } catch (error) {
            console.error('Load recent orders error:', error.message);
            recentContainer.innerHTML = '<p style="color: #dc3545;">Failed to load recent orders.</p>';
        }
    }

    // Initialize enhanced food system
    function initEnhancedFoodSystem() {
        // Add event listener to food dropdown
        const foodSelect = document.getElementById('food');
        if (foodSelect) {
            foodSelect.addEventListener('change', updateFoodOptions);
            
            // Debug: Log when food changes
            foodSelect.addEventListener('change', function() {
                const selectedFood = this.value;
                console.log('Selected food:', selectedFood);
                if (FOOD_OPTIONS[selectedFood]) {
                    console.log('Food config:', FOOD_OPTIONS[selectedFood]);
                }
            });
        }
        
        // Add management interface in debug mode
        addFoodManagementInterface();
        
        debugLog('🍔 Enhanced food selection system initialized');
    }

    // Initialize
    function init() {
        const currentPage = getCurrentPage();
        
        // Reset tracking variables
        lastOrderCount = 0;
        lastDataHash = '';
        lastTrackingOrderData = null;
        lastKitchenStatus = null;
        lastRecentOrdersHash = '';
        
        showPage(currentPage);
        
        debugLog(`[INIT] Application initialized on ${currentPage} page with real-time updates`);
    }

    // Enhanced Event Listeners
    function setupEventListeners() {
        // Enhanced order form handling with food options
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Validate food options first
                if (!validateFoodOptions()) {
                    return;
                }
                
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Placing Order...';
                
                try {
                    const formData = new FormData(this);
                    const selectedSubOptions = getSelectedSubOptions();
                    
                    // Build the complete food description
                    let foodDescription = formData.get('food');
                    if (selectedSubOptions) {
                        foodDescription += ` (${selectedSubOptions})`;
                    }
                    
                    const order = {
                        food: foodDescription,
                        room: formData.get('room'),
                        name: formData.get('name'),
                        comments: formData.get('comments') || ''
                    };
                    
                    const response = await addOrder(order);
                    this.reset();
                    
                    // Clear dynamic options
                    const existingOptions = document.querySelectorAll('[id^="foodOptions"]');
                    existingOptions.forEach(el => el.remove());
                    
                    debugLog(`[NEW ORDER] Enhanced order placed successfully: ${response.order?.id}`);
                    
                    // Force refresh on manager page if it's open
                    // This is a workaround since SSE might not be working
                    if (response.order && response.order.id) {
                        // Force recent orders to update
                        setTimeout(() => {
                            loadRecentOrders();
                        }, 1000);
                        
                        // Redirect to tracking page
                        setTimeout(() => {
                            window.location.href = `?id=${response.order.id}`;
                        }, 500);
                    } else {
                        showMessage('success', 'Order placed successfully!');
                        // Force recent orders to update
                        setTimeout(() => {
                            loadRecentOrders();
                        }, 1000);
                    }
                    
                } catch (error) {
                    console.error('Order submission error:', error.message);
                    const errorMessage = error.message?.includes('HTTP 500') 
                        ? 'Server error. Please check your API configuration and try again.' 
                        : 'Failed to place order. Please try again.';
                    showMessage('error', errorMessage);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Place Order';
                }
            });
        }

        // ENHANCED: Triple click detection for direct manager authentication
        let clickCount = 0;
        let clickTimer = null;
        const header = document.querySelector('.header');
        if (header) {
            header.addEventListener('click', async function() {
                clickCount++;
                
                // Clear existing timer
                if (clickTimer) {
                    clearTimeout(clickTimer);
                }
                
                // Check for triple click - go directly to authentication
                if (clickCount === 3) {
                    debugLog('[MANAGER ACCESS] Triple click detected - attempting direct authentication');
                    clickCount = 0; // Reset immediately
                    
                    // Go directly to manager authentication
                    const authenticated = await authenticateManager();
                    if (authenticated) {
                        debugLog('[MANAGER ACCESS] Authentication successful - redirecting to manager page');
                        window.location.href = '?page=manager';
                    } else {
                        debugLog('[MANAGER ACCESS] Authentication failed');
                    }
                } else {
                    // Set timer to reset click count after 800ms
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                    }, 800);
                }
            });
        }

        // Manager access link (now optional - triple click goes direct)
        const managerLink = document.getElementById('managerAccess');
        if (managerLink) {
            managerLink.addEventListener('click', async function(e) {
                e.preventDefault();
                debugLog('[MANAGER ACCESS] Manager link clicked - going to authentication');
                
                // Hide the link immediately
                this.style.display = 'none';
                
                // Go directly to manager authentication
                const authenticated = await authenticateManager();
                if (authenticated) {
                    debugLog('[MANAGER ACCESS] Authentication successful - redirecting to manager page');
                    window.location.href = '?page=manager';
                } else {
                    debugLog('[MANAGER ACCESS] Authentication failed');
                }
            });
        }
    }

    // Test sound function for managers
    function testNotificationSound() {
        if (!userHasInteracted) {
            enableAudioAfterUserGesture();
        }
        
        playNewOrderSound();
        
        // Show feedback
        showMessage('success', userHasInteracted ? 
            'Sound test played! 🔔' : 
            'Sound enabled! Click anywhere to activate audio, then test again.', 3000);
    }

    // Global function assignments for onclick handlers
    window.toggleKitchenStatus = toggleKitchenStatus;
    window.loadOrders = loadOrders;
    window.clearAllOrders = clearAllOrders;
    window.logoutManager = logoutManager;
    window.goToOrderPage = goToOrderPage;
    window.testNotificationSound = testNotificationSound;
    window.adjustCounter = adjustCounter;
    window.toggleBoolean = toggleBoolean;
    window.toggleConditional = toggleConditional;

    // Enhanced cleanup and navigation handling
    window.addEventListener('beforeunload', function() {
        closeRealTimeConnection();
        stopEventDrivenUpdates();
        debugLog('[CLEANUP] Stopping updates and closing connections before page unload');
    });
    
    window.addEventListener('popstate', function() {
        debugLog('[NAVIGATION] Popstate detected - reinitializing');
        init();
    });
    
    // Handle visibility changes to pause/resume updates when tab is hidden/shown
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            debugLog('[VISIBILITY] Tab hidden - real-time connection will pause');
        } else {
            debugLog('[VISIBILITY] Tab visible - real-time connection will resume');
            // Force a quick update when tab becomes visible again
            setTimeout(() => {
                const currentPage = getCurrentPage();
                if (currentPage === 'manager') {
                    loadOrders();
                } else if (currentPage === 'tracking') {
                    loadOrderTracking();
                }
                loadRecentOrders();
            }, 500);
        }
    });
    
    // Show performance info on page load
    setTimeout(() => {
        if (DEBUG_MODE) {
            console.log('📊 Real-time Updates Summary:');
            console.log('🔄 Real-time events via Server-Sent Events (SSE) with polling fallback');
            console.log('📡 Enhanced polling intervals:', UPDATE_INTERVALS);
            console.log('🔔 Bell sound notifications enabled (/assets/bell.mp3)');
            console.log('🎵 Audio requires user interaction (Chrome autoplay policy)');
            console.log('🍔 Enhanced food selection system enabled');
            console.log('🖱️ Triple-click header for direct manager authentication');
            console.log('🎯 Click anywhere to enable audio notifications');
            console.log('⚡ Real-time updates for: Kitchen status, New orders, Order status changes');
            console.log('🔗 Connection indicator in top-right corner');
        }
    }, 1000);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupActivityTracking();
            setupEventListeners();
            initEnhancedFoodSystem();
            init();
            debugLog('[STARTUP] Application fully loaded with real-time updates and enhanced food selection');
        });
    } else {
        setupActivityTracking();
        setupEventListeners();
        initEnhancedFoodSystem();
        init();
        debugLog('[STARTUP] Application fully loaded with real-time updates and enhanced food selection');
    }

    // ========== ADDITIONAL UTILITY FUNCTIONS ==========
    
    // Format timestamps for display
    function formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-NZ', {
                timeZone: 'Pacific/Auckland',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
            });
        } catch (e) {
            return timestamp;
        }
    }
    
    // Validate order data before submission
    function validateOrderData(order) {
        if (!order.food || order.food.trim() === '') {
            throw new Error('Please select a food item');
        }
        if (!order.room || order.room.trim() === '') {
            throw new Error('Please enter your room number');
        }
        if (!order.name || order.name.trim() === '') {
            throw new Error('Please enter your name');
        }
        return true;
    }
    
    // Enhanced error reporting for debugging
    function reportError(error, context = '') {
        const errorReport = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            page: getCurrentPage()
        };
        
        debugLog('🚨 ERROR REPORT:', errorReport);
        
        // In production, you could send this to an error tracking service
        if (DEBUG_MODE) {
            console.error('Full error details:', errorReport);
        }
    }
    
    // Network status detection
    function setupNetworkStatusTracking() {
        function updateOnlineStatus() {
            const isOnline = navigator.onLine;
            const indicator = document.getElementById('connectionStatus');
            
            if (!isOnline && indicator) {
                indicator.textContent = '📴 Offline';
                indicator.style.backgroundColor = '#6c757d';
                indicator.style.color = 'white';
                debugLog('🌐 Network: OFFLINE');
            } else if (isOnline && indicator && indicator.textContent === '📴 Offline') {
                // Reconnect when back online
                debugLog('🌐 Network: ONLINE - attempting to reconnect');
                setTimeout(() => {
                    setupRealTimeUpdates();
                }, 1000);
            }
        }
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Check initial status
    }
    
    // Enhanced keyboard shortcuts for managers
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Only enable shortcuts on manager page
            if (getCurrentPage() !== 'manager') return;
            
            // Ctrl/Cmd + R: Refresh orders
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                loadOrders();
                showMessage('success', 'Orders refreshed', 2000);
            }
            
            // Ctrl/Cmd + K: Toggle kitchen status
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleKitchenStatus();
            }
            
            // Ctrl/Cmd + T: Test sound
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                testNotificationSound();
            }
            
            // Escape: Clear all selections
            if (e.key === 'Escape') {
                const activeElements = document.querySelectorAll('.status-btn:focus, .delete-btn:focus');
                activeElements.forEach(el => el.blur());
            }
        });
        
        debugLog('⌨️ Keyboard shortcuts enabled for manager page');
    }
    
    // Auto-save form data to prevent loss
    function setupAutoSave() {
        const orderForm = document.getElementById('orderForm');
        if (!orderForm) return;
        
        const AUTOSAVE_KEY = 'food_order_draft';
        
        // Load saved data on page load
        function loadDraft() {
            try {
                const saved = localStorage.getItem(AUTOSAVE_KEY);
                if (saved) {
                    const data = JSON.parse(saved);
                    const now = Date.now();
                    
                    // Only restore if saved within last hour
                    if (now - data.timestamp < 60 * 60 * 1000) {
                        if (data.food) {
                            const foodSelect = document.getElementById('food');
                            if (foodSelect) foodSelect.value = data.food;
                        }
                        if (data.room) {
                            const roomInput = document.getElementById('room');
                            if (roomInput) roomInput.value = data.room;
                        }
                        if (data.name) {
                            const nameInput = document.getElementById('name');
                            if (nameInput) nameInput.value = data.name;
                        }
                        if (data.comments) {
                            const commentsInput = document.getElementById('comments');
                            if (commentsInput) commentsInput.value = data.comments;
                        }
                        
                        debugLog('📝 Draft order restored from autosave');
                    }
                }
            } catch (e) {
                debugLog('❌ Failed to load draft:', e.message);
            }
        }
        
        // Save form data as user types
        function saveDraft() {
            try {
                const formData = new FormData(orderForm);
                const data = {
                    food: formData.get('food'),
                    room: formData.get('room'),
                    name: formData.get('name'),
                    comments: formData.get('comments'),
                    timestamp: Date.now()
                };
                
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
            } catch (e) {
                debugLog('❌ Failed to save draft:', e.message);
            }
        }
        
        // Clear draft when order is successfully submitted
        function clearDraft() {
            try {
                localStorage.removeItem(AUTOSAVE_KEY);
                debugLog('🗑️ Draft order cleared after successful submission');
            } catch (e) {
                debugLog('❌ Failed to clear draft:', e.message);
            }
        }
        
        // Set up event listeners
        const inputs = orderForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', saveDraft);
            input.addEventListener('change', saveDraft);
        });
        
        // Clear draft on successful form submission
        orderForm.addEventListener('submit', function() {
            setTimeout(clearDraft, 1000); // Clear after successful submission
        });
        
        // Load draft on page load
        setTimeout(loadDraft, 500);
        
        debugLog('💾 Auto-save enabled for order form');
    }
    
    // Analytics and usage tracking (privacy-friendly)
    function setupAnalytics() {
        const analytics = {
            pageViews: 0,
            orderAttempts: 0,
            successfulOrders: 0,
            managerLogins: 0,
            startTime: Date.now()
        };
        
        // Track page views
        analytics.pageViews++;
        
        // Track order attempts
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', function() {
                analytics.orderAttempts++;
                debugLog(`📊 Analytics: ${analytics.orderAttempts} order attempts`);
            });
        }
        
        // Track successful orders (when redirected to tracking page)
        if (getCurrentPage() === 'tracking') {
            analytics.successfulOrders++;
            debugLog(`📊 Analytics: ${analytics.successfulOrders} successful orders`);
        }
        
        // Track manager logins
        if (getCurrentPage() === 'manager') {
            analytics.managerLogins++;
            debugLog(`📊 Analytics: ${analytics.managerLogins} manager logins`);
        }
        
        // Report analytics periodically (for debugging)
        if (DEBUG_MODE) {
            setInterval(() => {
                const sessionTime = Math.round((Date.now() - analytics.startTime) / 1000);
                console.log('📊 Session Analytics:', {
                    ...analytics,
                    sessionTimeSeconds: sessionTime
                });
            }, 30000); // Every 30 seconds
        }
        
        window.foodOrderAnalytics = analytics;
    }
    
    // Initialize additional features
    setupNetworkStatusTracking();
    setupKeyboardShortcuts();
    setupAutoSave();
    setupAnalytics();
    
    debugLog('🎉 All systems initialized and ready!');

})();
    
    // Validate password
    function validateCredentials(input) {
        if (!input || typeof input !== 'string') return false;
        const expected = getAuthKey();
        if (!expected) return false;
        return input === expected;
    }
    
    // Session management functions
    function createSession() {
        const now = Date.now();
        const sessionData = {
            authenticated: true,
            loginTime: now,
            lastActivity: now,
            version: '2.0'
        };
        
        try {
            sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(sessionData));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function getSession() {
        try {
            const stored = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }
    
    function updateSessionActivity() {
        const session = getSession();
        if (session && session.authenticated) {
            session.lastActivity = Date.now();
            sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
            return true;
        }
        return false;
    }
    
    function clearSession() {
        try {
            sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function isSessionValid() {
        const session = getSession();
        if (!session || !session.authenticated) return false;
        
        const now = Date.now();
        
        if (now - session.loginTime > SESSION_DURATION) {
            clearSession();
            return false;
        }
        
        if (now - session.lastActivity > ACTIVITY_TIMEOUT) {
            clearSession();
            return false;
        }
        
        return true;
    }
    
    // Main authentication function
    function authenticateManager() {
        if (isSessionValid()) {
            updateSessionActivity();
            return true;
        }
        
        const credentials = prompt('Enter manager access code:');
        if (!credentials) return false;
        
        if (validateCredentials(credentials)) {
            if (createSession()) {
                return true;
            } else {
                alert('Session creation failed. Please try again.');
                return false;
            }
        } else {
            alert('Invalid access code. Access denied.');
            return false;
        }
    }
    
    // Activity tracking setup
    function setupActivityTracking() {
        const events = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, function() {
                updateSessionActivity();
                // Enable audio after first user interaction
                enableAudioAfterUserGesture();
            }, { passive: true });
        });
        
        setInterval(function() {
            if (!isSessionValid()) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('page') === 'manager') {
                    alert('Session expired. Redirecting to main page.');
                    window.location.href = window.location.pathname;
                }
            }
        }, 60000);
    }
    
    // ========== ENHANCED FOOD SELECTION SYSTEM ==========
    
    // Enhanced function to generate dynamic options HTML
    function generateOptionsHTML(foodItem) {
        const config = FOOD_OPTIONS[foodItem];
        if (!config) return '';

        let html = '';

        if (config.type === 'single') {
            html = `
                <div class="form-group" id="foodOptions">
                    <label for="foodSubOptions">${config.label}:</label>
                    <select id="foodSubOptions" name="foodSubOptions" required>
                        <option value="">Select an option...</option>
            `;
            config.options.forEach(option => {
                html += `<option value="${option}">${option}</option>`;
            });
            html += '</select></div>';
        } else if (config.type === 'multiple') {
            html = `
                <div class="form-group" id="foodOptions">
                    <label for="foodSubOptions">${config.label}:</label>
                    <div class="checkbox-group">
            `;
            config.options.forEach((option, index) => {
                html += `
                    <div class="checkbox-item">
                        <input type="checkbox" id="option${index}" name="foodSubOptions" value="${option}">
                        <label for="option${index}">${option}</label>
                    </div>
                `;
            });
            html += '</div></div>';
        } else if (config.type === 'multiSection') {
            // Handle multi-section configurations (like Chicken Wraps)
            config.sections.forEach((section, sectionIndex) => {
                html += `
                    <div class="form-group" id="foodOptions${sectionIndex}">
                        <label>${section.label}:</label>
                `;
                
                if (section.minRequired > 0) {
                    html += `<small style="color: #FF6B35; font-weight: 600; display: block; margin-bottom: 10px;">*Minimum ${section.minRequired} selections required</small>`;
                }
                
                html += '<div class="checkbox-group">';
                section.options.forEach((option, optionIndex) => {
                    html += `
                        <div class="checkbox-item">
                            <input type="checkbox" 
                                   id="${section.id}_option${optionIndex}" 
                                   name="foodSubOptions_${section.id}" 
                                   value="${option}"
                                   data-section="${section.id}"
                                   data-min-required="${section.minRequired || 0}">
                            <label for="${section.id}_option${optionIndex}">${option}</label>
                        </div>
                    `;
                });
                html += '</div></div>';
            });
        } else if (config.type === 'beverageCustom') {
            // Handle beverage customization with counters and boolean options
            config.sections.forEach((section, sectionIndex) => {
                html += `<div class="form-group beverage-option" id="foodOptions${sectionIndex}">`;
                
                if (section.type === 'counter') {
                    const defaultValue = section.default || section.min || 0;
                    html += `
                        <div class="counter-control">
                            <label>${section.label}:</label>
                            <div class="counter-buttons">
                                <button type="button" class="counter-btn" 
                                        onclick="adjustCounter('${section.id}', -1, ${section.min}, ${section.max})"
                                        data-action="decrease">−</button>
                                <div class="counter-display" id="counter_${section.id}">${defaultValue}</div>
                                <button type="button" class="counter-btn" 
                                        onclick="adjustCounter('${section.id}', 1, ${section.min}, ${section.max})"
                                        data-action="increase">+</button>
                            </div>
                            <input type="hidden" id="hidden_${section.id}" name="beverage_${section.id}" value="${defaultValue}">
                        </div>
                    `;
                } else if (section.type === 'boolean') {
                    const defaultValue = section.default || section.options[0];
                    html += `
                        <div class="boolean-control">
                            <label>${section.label}:</label>
                            <div class="boolean-buttons">
                    `;
                    section.options.forEach((option, optionIndex) => {
                        const isActive = option === defaultValue;
                        html += `
                            <button type="button" class="boolean-btn ${isActive ? 'active' : ''}" 
                                    onclick="toggleBoolean('${section.id}', '${option}')"
                                    data-option="${option}">${option}</button>
                        `;
                    });
                    html += `
                            </div>
                            <input type="hidden" id="hidden_${section.id}" name="beverage_${section.id}" value="${defaultValue}">
                        </div>
                    `;
                } else if (section.type === 'conditional') {
                    const defaultValue = section.default || section.options[0];
                    const isVisible = false; // Initially hidden
                    html += `
                        <div class="conditional-control ${isVisible ? 'visible' : ''}" id="conditional_${section.id}">
                            <label>${section.label}:</label>
                            <div class="conditional-buttons">
                    `;
                    section.options.forEach((option, optionIndex) => {
                        const isActive = option === defaultValue;
                        html += `
                            <button type="button" class="conditional-btn ${isActive ? 'active' : ''}" 
                                    onclick="toggleConditional('${section.id}', '${option}')"
                                    data-option="${option}">${option}</button>
                        `;
                    });
                    html += `
                            </div>
                            <input type="hidden" id="hidden_${section.id}" name="beverage_${section.id}" value="${defaultValue}">
                        </div>
                    `;
                }
                
                html += '</div>';
            });
        }

        return html;
    }

    // Counter control function for beverages
    function adjustCounter(sectionId, change, min, max) {
        const display = document.getElementById(`counter_${sectionId}`);
        const hidden = document.getElementById(`hidden_${sectionId}`);
        
        if (!display || !hidden) return;
        
        let currentValue = parseInt(hidden.value) || 0;
        let newValue = currentValue + change;
        
        // Enforce min/max bounds
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;
        
        // Update display and hidden input
        display.textContent = newValue;
        hidden.value = newValue;
        
        // Update button states
        const decreaseBtn = document.querySelector(`[onclick*="adjustCounter('${sectionId}', -1"]`);
        const increaseBtn = document.querySelector(`[onclick*="adjustCounter('${sectionId}', 1"]`);
        
        if (decreaseBtn) decreaseBtn.disabled = (newValue <= min);
        if (increaseBtn) increaseBtn.disabled = (newValue >= max);
        
        console.log(`Counter ${sectionId}: ${currentValue} → ${newValue} (range: ${min}-${max})`);
    }

    // Boolean toggle function for beverages
    function toggleBoolean(sectionId, selectedOption) {
        const hidden = document.getElementById(`hidden_${sectionId}`);
        const buttons = document.querySelectorAll(`[onclick*="toggleBoolean('${sectionId}'"]`);
        
        if (!hidden) return;
        
        // Update hidden input
        hidden.value = selectedOption;
        
        // Update button states
        buttons.forEach(btn => {
            const option = btn.getAttribute('data-option');
            if (option === selectedOption) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Handle conditional fields that depend on this boolean
        handleConditionalVisibility(sectionId, selectedOption);
        
        console.log(`Boolean ${sectionId}: ${selectedOption}`);
    }

    // Conditional toggle function for beverages
    function toggleConditional(sectionId, selectedOption) {
        const hidden = document.getElementById(`hidden_${sectionId}`);
        const buttons = document.querySelectorAll(`[onclick*="toggleConditional('${sectionId}'"]`);
        
        if (!hidden) return;
        
        // Update hidden input
        hidden.value = selectedOption;
        
        // Update button states
        buttons.forEach(btn => {
            const option = btn.getAttribute('data-option');
            if (option === selectedOption) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        console.log(`Conditional ${sectionId}: ${selectedOption}`);
    }

    // Handle conditional field visibility
    function handleConditionalVisibility(dependencyId, selectedValue) {
        const foodSelect = document.getElementById('food');
        const selectedFood = foodSelect.value;
        
        if (!selectedFood || !FOOD_OPTIONS[selectedFood]) return;
        
        const config = FOOD_OPTIONS[selectedFood];
        if (config.type !== 'beverageCustom') return;
        
        // Find conditional sections that depend on this field
        config.sections.forEach(section => {
            if (section.type === 'conditional' && section.dependsOn === dependencyId) {
                const conditionalElement = document.getElementById(`conditional_${section.id}`);
                const hiddenInput = document.getElementById(`hidden_${section.id}`);
                
                if (conditionalElement && hiddenInput) {
                    if (selectedValue === section.showWhen) {
                        // Show the conditional field
                        conditionalElement.classList.add('visible');
                        
                        // Ensure the hidden input has a value
                        if (!hiddenInput.value) {
                            hiddenInput.value = section.default || section.options[0];
                            
                            // Update button states
                            const buttons = conditionalElement.querySelectorAll('.conditional-btn');
                            buttons.forEach(btn => {
                                const option = btn.getAttribute('data-option');
                                if (option === hiddenInput.value) {
                                    btn.classList.add('active');
                                } else {
                                    btn.classList.remove('active');
                                }
                            });
                        }
                    } else {
                        // Hide the conditional field
                        conditionalElement.classList.remove('visible');
                        
                        // Clear the value since it's not relevant
                        hiddenInput.value = '';
                        
                        // Reset button states
                        const buttons = conditionalElement.querySelectorAll('.conditional-btn');
                        buttons.forEach(btn => btn.classList.remove('active'));
                    }
                }
            }
        });
    }

    // SINGLE COMPLETE getSelectedSubOptions function - handles ALL food types including beverages
    function getSelectedSubOptions() {
        const foodSelect = document.getElementById('food');
        const selectedFood = foodSelect.value;
        
        if (!selectedFood || !FOOD_OPTIONS[selectedFood]) {
            return '';
        }
        
        const config = FOOD_OPTIONS[selectedFood];
        
        if (config.type === 'single') {
            const selectElement = document.getElementById('foodSubOptions');
            return selectElement ? selectElement.value : '';
        } else if (config.type === 'multiple') {
            const checkboxes = document.querySelectorAll('input[name="foodSubOptions"]:checked');
            const selected = Array.from(checkboxes).map(cb => cb.value);
            return selected.length > 0 ? selected.join(', ') : '';
        } else if (config.type === 'multiSection') {
            let allSelections = [];
            
            config.sections.forEach(section => {
                const checkboxes = document.querySelectorAll(`input[data-section="${section.id}"]:checked`);
                const selected = Array.from(checkboxes).map(cb => cb.value);
                
                if (selected.length > 0) {
                    allSelections.push(`${section.id}: ${selected.join(', ')}`);
                }
            });
            
            return allSelections.length > 0 ? allSelections.join(' | ') : '';
        } else if (config.type === 'beverageCustom') {
            let beverageOptions = [];
            
            config.sections.forEach(section => {
                const hiddenInput = document.getElementById(`hidden_${section.id}`);
                if (hiddenInput) {
                    if (section.type === 'counter') {
                        const value = parseInt(hiddenInput.value) || 0;
                        if (value > 0) {
                            beverageOptions.push(`${value} sugar`);
                        } else {
                            beverageOptions.push('no sugar');
                        }
                    } else if (section.type === 'boolean') {
                        const value = hiddenInput.value.toLowerCase();
                        if (section.id === 'milk') {
                            if (value === 'yes') {
                                beverageOptions.push('with milk');
                            } else {
                                beverageOptions.push('no milk');
                            }
                        } else if (section.id === 'hasCup') {
                            if (value === 'yes') {
                                beverageOptions.push('has cup');
                            } else {
                                beverageOptions.push('needs cup');
                            }
                        }
                    } else if (section.type === 'conditional') {
                        // Only include conditional values if they're actually visible and set
                        const parentSection = config.sections.find(s => s.id === section.dependsOn);
                        const parentInput = document.getElementById(`hidden_${section.dependsOn}`);
                        
                        if (parentInput && parentInput.value === section.showWhen && hiddenInput.value) {
                            if (section.id === 'cupLocation') {
                                beverageOptions.push(`cup: ${hiddenInput.value.toLowerCase()}`);
                            }
                        }
                    }
                }
            });
            
            return beverageOptions.length > 0 ? beverageOptions.join(', ') : '';
        }
        
        return '';
    }

    // Function to update the order form when food selection changes
    function updateFoodOptions() {
        const foodSelect = document.getElementById('food');
        
        // Remove ALL existing options (handle multiple sections)
        const existingOptions = document.querySelectorAll('[id^="foodOptions"]');
        existingOptions.forEach(el => el.remove());

        const selectedFood = foodSelect.value;
        if (selectedFood && FOOD_OPTIONS[selectedFood]) {
            const optionsHTML = generateOptionsHTML(selectedFood);
            
            // Insert after the food selection
            foodSelect.closest('.form-group').insertAdjacentHTML('afterend', optionsHTML);
            
            // Add validation for multi-section checkboxes
            if (FOOD_OPTIONS[selectedFood].type === 'multiSection') {
                setupMultiSectionValidation(selectedFood);
            }
        }
    }

    // Function to setup validation for multi-section options
    function setupMultiSectionValidation(foodItem) {
        const config = FOOD_OPTIONS[foodItem];
        if (!config || config.type !== 'multiSection') return;

        config.sections.forEach(section => {
            if (section.minRequired > 0) {
                const checkboxes = document.querySelectorAll(`input[data-section="${section.id}"]`);
                
                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        validateSection(section.id, section.minRequired);
                    });
                });
            }
        });
    }

    // Function to validate a section's minimum requirements
    function validateSection(sectionId, minRequired) {
        const checkboxes = document.querySelectorAll(`input[data-section="${sectionId}"]`);
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        // Visual feedback for validation
        const sectionContainer = checkboxes[0]?.closest('.form-group');
        if (sectionContainer) {
            const label = sectionContainer.querySelector('label');
            const smallText = sectionContainer.querySelector('small');
            
            if (checkedCount < minRequired) {
                if (smallText) {
                    smallText.style.color = '#DC3545';
                    smallText.innerHTML = `*Minimum ${minRequired} selections required (${checkedCount} selected)`;
                }
            } else {
                if (smallText) {
                    smallText.style.color = '#28A745';
                    smallText.innerHTML = `✓ ${checkedCount} selected`;
                }
            }
        }
        
        return checkedCount >= minRequired;
    }

    // Function to validate form before submission
    function validateFoodOptions() {
        const foodSelect = document.getElementById('food');
        const selectedFood = foodSelect.value;
        
        if (!selectedFood || !FOOD_OPTIONS[selectedFood]) {
            return true; // No special validation needed
        }
        
        const config = FOOD_OPTIONS[selectedFood];
        
        if (config.type === 'multiSection') {
            for (const section of config.sections) {
                if (section.minRequired > 0) {
                    const checkboxes = document.querySelectorAll(`input[data-section="${section.id}"]:checked`);
                    if (checkboxes.length < section.minRequired) {
                        alert(`Please select at least ${section.minRequired} options for "${section.label}"`);
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    // Function to add easy management interface (for development/admin)
    function addFoodManagementInterface() {
        // Only show in development or if debug mode is on
        if (!DEBUG_MODE) return;
        
        console.log('🍔 FOOD OPTIONS CONFIGURATION:');
        console.log('To modify food options, edit the FOOD_OPTIONS object in script.js');
        console.log('Current configuration:', FOOD_OPTIONS);
        console.log(`
Available food types:
- 'single': Radio button selection (one choice)
- 'multiple': Checkbox selection (multiple choices)
- 'multiSection': Multiple sections with different requirements

Example configuration:
FOOD_OPTIONS['New Food Item'] = {
    type: 'single',
    label: 'Choose an option',
    options: ['Option 1', 'Option 2', 'Option 3']
};
        `);
    }
    
    // ========== REAL-TIME UPDATES SYSTEM ==========
    
    // Server-Sent Events connection for real-time updates
    let eventSource = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    const RECONNECT_DELAY = 2000;
    let sseSupported = true;
    let isUsingPolling = false;
    
    // Setup Server-Sent Events connection
    function setupRealTimeUpdates() {
        if (eventSource) {
            eventSource.close();
        }
        
        // For now, always use polling since SSE might not be configured
        // Remove this line when SSE is properly set up
        sseSupported = false;
        
        // If SSE is not supported or we've given up, use polling
        if (!sseSupported || isUsingPolling) {
            fallbackToPolling();
            return;
        }
        
        const currentPage = getCurrentPage();
        debugLog(`🔄 Setting up real-time updates for ${currentPage} page`);
        
        try {
            eventSource = new EventSource('/api/events');
            
            eventSource.onopen = function() {
                debugLog('🔗 Real-time connection established');
                reconnectAttempts = 0;
                showConnectionStatus(true);
            };
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleRealTimeEvent(data);
                } catch (error) {
                    debugLog('❌ Failed to parse SSE event:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                debugLog('🔌 Real-time connection error:', error);
                showConnectionStatus(false);
                
                // Immediately fallback to polling on first error
                debugLog('❌ SSE not available - falling back to polling immediately');
                sseSupported = false;
                fallbackToPolling();
            };
            
            // Auto-reconnect every 20 seconds to handle Vercel timeout
            setTimeout(() => {
                if (eventSource && eventSource.readyState === EventSource.OPEN) {
                    debugLog('🔄 Refreshing SSE connection to avoid timeout');
                    setupRealTimeUpdates();
                }
            }, 20000);
            
        } catch (error) {
            debugLog('❌ Failed to setup SSE, falling back to polling:', error);
            sseSupported = false;
            fallbackToPolling();
        }
    }
    
    // Handle incoming real-time events
    function handleRealTimeEvent(event) {
        const currentPage = getCurrentPage();
        debugLog(`📨 Real-time event received: ${event.type}`, event.data);
        
        switch (event.type) {
            case 'connected':
                debugLog('✅ Real-time updates connected');
                break;
                
            case 'heartbeat':
                // Silent heartbeat - just keep connection alive
                break;
                
            case 'NEW_ORDER':
                if (currentPage === 'manager') {
                    debugLog('🔔 New order received - refreshing manager view');
                    playNewOrderSound();
                    showNewOrderNotification(1);
                    loadOrders();
                }
                // Always refresh recent orders
                loadRecentOrders();
                break;
                
            case 'ORDER_STATUS_UPDATED':
                if (currentPage === 'manager') {
                    debugLog('📝 Order status updated - refreshing manager view');
                    loadOrders();
                }
                if (currentPage === 'tracking') {
                    const trackingOrderId = getOrderIdFromUrl();
                    if (trackingOrderId === event.data.orderId) {
                        debugLog(`📱 Tracked order ${trackingOrderId} updated - refreshing tracking view`);
                        loadOrderTracking();
                    }
                }
                loadRecentOrders();
                break;
                
            case 'KITCHEN_STATUS_CHANGED':
                debugLog(`🏪 Kitchen status changed to: ${event.data.isOpen ? 'OPEN' : 'CLOSED'}`);
                const previousKitchenStatus = kitchenOpen;
                kitchenOpen = event.data.isOpen;
                
                // Always update button when kitchen status changes
                updateKitchenButton();
                
                if (currentPage === 'manager') {
                    loadOrders();
                } else if (currentPage === 'order') {
                    updateOrderPageDisplay();
                }
                
                showMessage('success', `Kitchen ${event.data.isOpen ? 'opened' : 'closed'}!`, 3000);
                debugLog(`[REAL-TIME] Kitchen button updated: ${previousKitchenStatus} → ${kitchenOpen}`);
                break;
                
            case 'ORDERS_CLEARED':
                if (currentPage === 'manager') {
                    debugLog('🗑️ All orders cleared - refreshing manager view');
                    loadOrders();
                }
                if (currentPage === 'tracking') {
                    debugLog('🗑️ Orders cleared - updating tracking view');
                    loadOrderTracking();
                }
                loadRecentOrders();
                break;
                
            case 'ORDER_DELETED':
                if (currentPage === 'manager') {
                    debugLog(`🗑️ Order ${event.data.orderId} deleted - refreshing manager view`);
                    loadOrders();
                }
                if (currentPage === 'tracking') {
                    const trackingOrderId = getOrderIdFromUrl();
                    if (trackingOrderId === event.data.orderId) {
                        debugLog(`🗑️ Tracked order ${trackingOrderId} was deleted`);
                        const trackingOrderDetails = document.getElementById('trackingOrderDetails');
                        if (trackingOrderDetails) {
                            trackingOrderDetails.innerHTML = `
                                <div class="error-message" style="display: block;">
                                    This order has been deleted by a manager.
                                </div>
                            `;
                        }
                    }
                }
                loadRecentOrders();
                break;
                
            default:
                debugLog('🤷 Unknown event type:', event.type);
        }
    }
    
    // Show connection status indicator
    function showConnectionStatus(connected) {
        // Add visual indicator to show connection status
        let indicator = document.getElementById('connectionStatus');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connectionStatus';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                font-weight: bold;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        if (connected) {
            if (isUsingPolling) {
                indicator.textContent = '📡 Polling Mode';
                indicator.style.backgroundColor = '#ffc107';
                indicator.style.color = '#000';
            } else {
                indicator.textContent = '🔗 Real-time';
                indicator.style.backgroundColor = '#28a745';
                indicator.style.color = 'white';
            }
        } else {
            indicator.textContent = '❌ Offline';
            indicator.style.backgroundColor = '#dc3545';
            indicator.style.color = 'white';
        }
        
        debugLog(`🔗 Connection status: ${connected ? (isUsingPolling ? 'Polling Mode' : 'Real-time') : 'Disconnected'}`);
    }
    
    // Fallback to polling if SSE fails
    function fallbackToPolling() {
        debugLog('📡 Falling back to enhanced polling mode');
        isUsingPolling = true;
        showConnectionStatus(true);
        startEventDrivenUpdates();
    }
    
    // Close real-time connection
    function closeRealTimeConnection() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
            debugLog('🔌 Real-time connection closed');
        }
    }
    
    // Enhanced debug mode with performance tracking
    const DEBUG_MODE = false;
    let performanceMetrics = {
        requests: 0,
        averageResponseTime: 0,
        lastRequestTime: 0
    };
    
    function debugLog(...args) {
        if (DEBUG_MODE) {
            console.log(...args);
        }
    }

    function trackPerformance(startTime) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        performanceMetrics.requests++;
        performanceMetrics.averageResponseTime = 
            (performanceMetrics.averageResponseTime * (performanceMetrics.requests - 1) + responseTime) / performanceMetrics.requests;
        performanceMetrics.lastRequestTime = responseTime;
        
        debugLog(`⚡ Response Time: ${responseTime.toFixed(2)}ms (Avg: ${performanceMetrics.averageResponseTime.toFixed(2)}ms) | Total Requests: ${performanceMetrics.requests}`);
    }

    // Utility functions
    function getNZTime() {
        return new Date().toLocaleString('en-NZ', {
            timeZone: 'Pacific/Auckland',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Enhanced UI Functions
    function showMessage(type, message, duration = 3000) {
        const messageEl = document.getElementById(`${type}Message`);
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.display = 'block';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, duration);
        }
    }

    function getCurrentPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const id = urlParams.get('id');
        
        if (id) return 'tracking';
        return page === 'manager' ? 'manager' : 'order';
    }

    function getOrderIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    function goToOrderPage() {
        window.location.href = window.location.pathname;
    }

    // ========== REDUCED FREQUENCY UPDATE SYSTEM (FALLBACK) ==========
    
    let lastDataHash = '';
    let lastOrderCount = 0;
    let updateCheckInterval;
    let lastTrackingOrderData = null;
    let lastKitchenStatus = null;
    let lastRecentOrdersHash = '';
    
    // SHORTER intervals for fallback polling to compensate for no real-time updates
    const UPDATE_INTERVALS = {
        manager: 2000,     // 2 seconds for manager (needs very frequent updates)
        tracking: 3000,    // 3 seconds for tracking
        order: 5000        // 5 seconds for order page
    };
    
    function calculateDataHash(orders, recentOrders, kitchenStatus) {
        const dataString = JSON.stringify({
            orders: orders.map(o => `${o.id}-${o.status}-${o.timestamp}`),
            recentCount: recentOrders.length,
            recentHash: recentOrders.map(o => `${o.id}-${o.status}`).join(','),
            kitchen: kitchenStatus
        });
        return btoa(dataString).slice(0, 20);
    }
    
    // Enhanced sound notification system using uploaded bell sound
    let audioContext = null;
    let userHasInteracted = false;
    
    // Initialize audio context after user interaction
    function initAudioContext() {
        if (!audioContext && userHasInteracted) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                debugLog('🔊 Audio context initialized after user interaction');
            } catch (error) {
                debugLog('🔇 Could not initialize audio context:', error.message);
            }
        }
    }
    
    // Enable audio after user interaction and update UI
    function enableAudioAfterUserGesture() {
        if (!userHasInteracted) {
            userHasInteracted = true;
            initAudioContext();
            debugLog('🎯 User interaction detected - audio enabled');
            
            // Update test sound button if we're on manager page
            const testButton = document.querySelector('button[onclick="testNotificationSound()"]');
            if (testButton) {
                testButton.innerHTML = '🔔 Test Sound (Ready)';
                testButton.style.backgroundColor = '#28a745';
            }
        }
    }
    
    function playNewOrderSound() {
        // Try to play the bell sound first
        try {
            const audio = new Audio('/assets/bell.mp3');
            audio.volume = 0.7;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        debugLog('🔔 Bell notification played successfully');
                    })
                    .catch(error => {
                        debugLog('🔇 Bell sound failed, trying fallback:', error.message);
                        playFallbackSound();
                    });
            }
        } catch (error) {
            debugLog('🔇 Could not load bell sound, trying fallback:', error.message);
            playFallbackSound();
        }
    }
    
    // Fallback sound generation with user interaction check
    function playFallbackSound() {
        if (!userHasInteracted) {
            debugLog('🔇 Cannot play fallback sound - no user interaction yet');
            return;
        }
        
        try {
            if (!audioContext) {
                initAudioContext();
            }
            
            if (!audioContext || audioContext.state !== 'running') {
                debugLog('🔇 Audio context not available for fallback sound');
                return;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Pleasant notification melody
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            debugLog('🔊 Fallback notification sound played');
        } catch (error) {
            debugLog('🔇 Could not play fallback sound:', error.message);
        }
    }
    
    function startEventDrivenUpdates() {
        // Clear any existing interval
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
        }
        
        const currentPage = getCurrentPage();
        const intervalTime = UPDATE_INTERVALS[currentPage] || 120000;
        
        debugLog(`🕒 Starting ${isUsingPolling ? 'enhanced' : 'fallback'} polling for ${currentPage} page (${intervalTime}ms interval)`);
        
        updateCheckInterval = setInterval(async () => {
            // Skip if tab is hidden to save requests
            if (document.hidden) {
                debugLog('📴 Tab hidden, skipping update');
                return;
            }
            
            const startTime = performance.now();
            
            try {
                const currentPage = getCurrentPage();
                
                // Batch requests efficiently - only get what we need
                const requestPromises = [];
                
                // Always get orders for any page type
                requestPromises.push(
                    fetch('/api/orders').then(r => r.json()).catch(() => [])
                );
                
                // Get recent orders more frequently when polling
                const shouldGetRecent = isUsingPolling ? (Math.random() < 0.7) : (Math.random() < 0.3);
                if (shouldGetRecent) {
                    requestPromises.push(
                        fetch('/api/orders?completed-orders=true').then(r => r.json()).catch(() => [])
                    );
                } else {
                    requestPromises.push(Promise.resolve([]));
                }
                
                // Get kitchen status only for manager/order pages
                if (currentPage === 'manager' || currentPage === 'order') {
                    requestPromises.push(
                        fetch('/api/orders?kitchen-status=true').then(r => r.json()).catch(() => ({ isOpen: false }))
                    );
                } else {
                    requestPromises.push(Promise.resolve({ isOpen: kitchenOpen }));
                }
                
                const [ordersResp, recentResp, kitchenResp] = await Promise.all(requestPromises);
                
                trackPerformance(startTime);
                
                const currentHash = calculateDataHash(ordersResp, recentResp, kitchenResp.isOpen);
                
                let hasChanges = false;
                
                // Enhanced change detection for polling mode
                if (isUsingPolling) {
                    // Check for new orders (for manager sound notifications)
                    if (lastOrderCount > 0 && ordersResp.length > lastOrderCount && currentPage === 'manager') {
                        const newOrdersCount = ordersResp.length - lastOrderCount;
                        debugLog(`🔔 NEW ORDERS DETECTED via polling: ${lastOrderCount} → ${ordersResp.length} (+${newOrdersCount})`);
                        
                        // Play sound notification
                        playNewOrderSound();
                        showNewOrderNotification(newOrdersCount);
                        hasChanges = true;
                    }
                    lastOrderCount = Array.isArray(ordersResp) ? ordersResp.length : 0;
                    
                    // Check for kitchen status changes
                    if (lastKitchenStatus !== null && kitchenResp.isOpen !== lastKitchenStatus) {
                        debugLog(`🔄 Kitchen status changed via polling: ${lastKitchenStatus} → ${kitchenResp.isOpen}`);
                        kitchenOpen = kitchenResp.isOpen;
                        
                        // Always update button regardless of page
                        updateKitchenButton();
                        
                        if (currentPage === 'manager') {
                            // Button already updated above
                        } else if (currentPage === 'order') {
                            updateOrderPageDisplay();
                        }
                        
                        showMessage('success', `Kitchen ${kitchenOpen ? 'opened' : 'closed'}!`, 2000);
                        hasChanges = true;
                    }
                    lastKitchenStatus = kitchenResp.isOpen;
                }
                
                // Only check for changes if we have existing data
                if (lastDataHash && currentHash !== lastDataHash) {
                    debugLog(`📊 ${isUsingPolling ? 'Enhanced' : 'Fallback'} polling detected changes, refreshing UI`);
                    
                    if (currentPage === 'manager') {
                        await loadOrders();
                    } else if (currentPage === 'tracking') {
                        await loadOrderTracking();
                    }
                    
                    await loadRecentOrders();
                    hasChanges = true;
                }
                
                lastDataHash = currentHash;
                
                if (hasChanges) {
                    debugLog(`✅ ${isUsingPolling ? 'Enhanced' : 'Fallback'} polling updated ${currentPage} page`);
                }
                
            } catch (error) {
                debugLog('❌ Polling error:', error.message);
            }
        }, intervalTime);
    }
    
    function stopEventDrivenUpdates() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
            updateCheckInterval = null;
            debugLog('🛑 Polling stopped');
        }
    }

    // Enhanced API FUNCTIONS
    async function getOrders() {
        const startTime = performance.now();
        try {
            debugLog('Fetching orders from /api/orders');
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orders = await response.json();
            trackPerformance(startTime);
            debugLog('Orders received:', orders.length, 'orders');
            return { orders: Array.isArray(orders) ? orders : [] };
        } catch (error) {
            console.error('Failed to get orders:', error.message);
            throw error;
        }
    }

    async function addOrder(order) {
        const startTime = performance.now();
        try {
            debugLog('Adding order:', order.food, 'for', order.name);

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            trackPerformance(startTime);
            debugLog('Order added successfully:', result.order?.id);
            
            return result;
        } catch (error) {
            console.error('Failed to add order:', error.message);
            throw error;
        }
    }

    async function getOrder(id) {
        try {
            const response = await getOrders();
            const order = response.orders.find(o => o.id === id);
            
            // If not found in active orders, check recent orders
            if (!order) {
                const recentResponse = await getRecentOrders();
                const recentOrder = recentResponse.orders.find(o => o.id === id);
                return { order: recentOrder };
            }
            
            return { order };
        } catch (error) {
            console.error('Failed to get order:', error.message);
            throw error;
        }
    }

    async function updateOrderStatus(id, status) {
        const startTime = performance.now();
        try {
            const updateData = { status };
            if (status === 'completed') {
                updateData.completedAt = getNZTime();
            }

            debugLog(`[API CALL] PUT /api/orders?update-order=${id} with status: ${status}`);
            const response = await fetch(`/api/orders?update-order=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                debugLog(`[API CALL] Error Response:`, response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            trackPerformance(startTime);
            debugLog(`[API CALL] Success Response:`, result);
            return result;
        } catch (error) {
            debugLog('[API CALL] Exception:', error);
            throw error;
        }
    }

    async function deleteOrder(orderId) {
        try {
            debugLog(`[DELETE ORDER] Starting deletion for Order ${orderId}`);
            
            if (!confirm(`Are you sure you want to permanently delete Order #${orderId}? This action cannot be undone.`)) {
                debugLog('[DELETE ORDER] Deletion cancelled by user confirmation');
                return;
            }
            
            const buttons = document.querySelectorAll('.status-btn, .delete-btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.classList.contains('delete-btn')) {
                    btn.textContent = 'Deleting...';
                }
            });
            
            const result = await deleteOrderFromAPI(orderId);
            debugLog(`[DELETE ORDER] Success:`, result);
            
            showMessage('success', `Order #${orderId} has been permanently deleted`);
            
            // Force immediate refresh after successful deletion
            setTimeout(() => {
                loadOrders();
                loadRecentOrders();
            }, 500);
            
            debugLog(`[DELETE ORDER] Deletion completed - forced UI refresh`);
            
        } catch (error) {
            debugLog('[DELETE ORDER] Error:', error);
            showMessage('error', 'Failed to delete order: ' + error.message);
            
            const buttons = document.querySelectorAll('.status-btn, .delete-btn');
            buttons.forEach(btn => {
                btn.disabled = false;
                if (btn.classList.contains('delete-btn')) {
                    btn.textContent = 'Delete';
                }
            });
        }
    }

    async function deleteOrderFromAPI(orderId) {
        const startTime = performance.now();
        try {
            debugLog(`[API CALL] DELETE /api/orders?delete-order=${orderId}`);
            const response = await fetch(`/api/orders?delete-order=${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                debugLog(`[API CALL] Error Response:`, response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            trackPerformance(startTime);
            debugLog(`[API CALL] Delete Success Response:`, result);
            return result;
        } catch (error) {
            debugLog('[API CALL] Delete Exception:', error);
            throw error;
        }
    }

    async function clearOrders() {
        const startTime = performance.now();
        try {
            debugLog('Clearing all orders');
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([])
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            trackPerformance(startTime);
            debugLog('Orders cleared successfully');
            return result;
        } catch (error) {
            console.error('Failed to clear orders:', error.message);
            throw error;
        }
    }

    async function getKitchenStatus() {
        const startTime = performance.now();
        try {
            debugLog('Fetching kitchen status');
            const response = await fetch('/api/orders?kitchen-status=true');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const status = await response.json();
            trackPerformance(startTime);
            debugLog('Kitchen status:', status.isOpen ? 'Open' : 'Closed');
            return status;
        } catch (error) {
            console.error('Failed to get kitchen status:', error.message);
            return { isOpen: false };
        }
    }

    async function setKitchenStatus(isOpen) {
        const startTime = performance.now();
        try {
            debugLog('Setting kitchen status to:', isOpen ? 'Open' : 'Closed');
            const response = await fetch('/api/orders?kitchen-status=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isOpen })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            trackPerformance(startTime);
            debugLog('Kitchen status updated successfully');
            return result;
        } catch (error) {
            console.error('Failed to set kitchen status:', error.message);
            throw error;
        }
    }

    async function getRecentOrders() {
        const startTime = performance.now();
        try {
            debugLog('Fetching recent orders');
            const response = await fetch('/api/orders?completed-orders=true');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orders = await response.json();
            trackPerformance(startTime);
            debugLog('Recent orders received:', orders.length, 'orders');
            return { orders: Array.isArray(orders) ? orders : [] };
        } catch (error) {
            console.error('Failed to get recent orders:', error.message);
            return { orders: [] };
        }
    }

    // Kitchen status management
    let kitchenOpen = false;

    async function toggleKitchenStatus() {
        try {
            const previousStatus = kitchenOpen;
            kitchenOpen = !kitchenOpen;
            
            // Update button immediately for better UX
            updateKitchenButton();
            debugLog(`[TOGGLE] Button updated immediately: ${previousStatus} → ${kitchenOpen}`);
            
            await setKitchenStatus(kitchenOpen);
            
            debugLog(`[KITCHEN] Status changed from ${previousStatus} to ${kitchenOpen} - real-time updates will handle UI refresh`);
            
        } catch (error) {
            console.error('Failed to update kitchen status:', error.message);
            // Revert on error
            kitchenOpen = !kitchenOpen;
            updateKitchenButton();
            updateOrderPageDisplay();
            showMessage('error', 'Failed to update kitchen status');
            debugLog(`[TOGGLE] Reverted button due to error: ${kitchenOpen}`);
        }
    }

    function updateKitchenButton() {
        const button = document.getElementById('kitchenToggle');
        if (button) {
            debugLog(`[UPDATE BUTTON] Updating kitchen button - kitchenOpen: ${kitchenOpen}`);
            if (kitchenOpen) {
                button.textContent = 'Close Kitchen';
                button.classList.remove('closed');
                debugLog(`[UPDATE BUTTON] Button set to: Close Kitchen (open state)`);
            } else {
                button.textContent = 'Open Kitchen';
                button.classList.add('closed');
                debugLog(`[UPDATE BUTTON] Button set to: Open Kitchen (closed state)`);
            }
        } else {
            debugLog(`[UPDATE BUTTON] Kitchen button not found!`);
        }
    }

    async function checkKitchenStatus() {
        try {
            const response = await getKitchenStatus();
            const newKitchenStatus = response.isOpen || false;
            
            if (newKitchenStatus !== kitchenOpen) {
                debugLog(`[KITCHEN CHECK] Status changed: ${kitchenOpen} → ${newKitchenStatus}`);
                kitchenOpen = newKitchenStatus;
                updateOrderPageDisplay();
                showMessage('success', `Kitchen ${kitchenOpen ? 'opened' : 'closed'}!`, 4000);
            } else {
                kitchenOpen = newKitchenStatus;
                updateOrderPageDisplay();
            }
            
            if (getCurrentPage() === 'manager') {
                updateKitchenButton();
            }
        } catch (error) {
            console.error('Failed to check kitchen status:', error.message);
            kitchenOpen = false;
            updateOrderPageDisplay();
        }
    }

    function updateOrderPageDisplay() {
        const closedMessage = document.getElementById('kitchenClosedMessage');
        const formContainer = document.getElementById('orderFormContainer');
        
        debugLog(`[ORDER PAGE] Updating display - Kitchen is ${kitchenOpen ? 'OPEN' : 'CLOSED'}`);
        
        if (closedMessage && formContainer) {
            if (kitchenOpen) {
                closedMessage.style.display = 'none';
                formContainer.style.display = 'block';
                debugLog(`[ORDER PAGE] Form shown - kitchen is open`);
            } else {
                closedMessage.style.display = 'block';
                formContainer.style.display = 'none';
                debugLog(`[ORDER PAGE] Form hidden - kitchen is closed`);
            }
        }
    };