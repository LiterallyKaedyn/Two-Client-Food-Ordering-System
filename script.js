// script.js - Complete Food Ordering System
// Reduced request frequency with sound notifications

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
    
    // ========== MAIN APPLICATION ==========
    
    // Enhanced debug mode with performance tracking
    const DEBUG_MODE = true;
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

    // ========== REDUCED FREQUENCY UPDATE SYSTEM ==========
    
    let lastDataHash = '';
    let lastOrderCount = 0;
    let updateCheckInterval;
    let lastTrackingOrderData = null;
    let lastKitchenStatus = null;
    let lastRecentOrdersHash = '';
    
    // MUCH LONGER intervals to reduce requests
    const UPDATE_INTERVALS = {
        manager: 20000,    // 20 seconds (was 3 seconds) 
        tracking: 15000,   // 15 seconds (was 2 seconds)
        order: 60000       // 1 minute (was 5 seconds)
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
    
    // Enhanced sound notification system
    function playNewOrderSound() {
        try {
            // Create a more pleasant notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
            
            debugLog('🔊 New order notification sound played');
        } catch (error) {
            debugLog('🔇 Could not play notification sound:', error.message);
        }
    }
    
    function startEventDrivenUpdates() {
        // Clear any existing interval
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
        }
        
        const currentPage = getCurrentPage();
        const intervalTime = UPDATE_INTERVALS[currentPage] || 60000;
        
        debugLog(`🕒 Starting reduced-frequency updates for ${currentPage} page (${intervalTime}ms interval)`);
        
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
                
                // Get recent orders (less frequently)
                if (Math.random() < 0.5) { // Only 50% of the time
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
                let shouldForceRefresh = false;
                
                // Kitchen status change detection
                if (lastKitchenStatus !== null && kitchenResp.isOpen !== lastKitchenStatus) {
                    debugLog(`🔄 Kitchen status changed: ${lastKitchenStatus} → ${kitchenResp.isOpen}`);
                    kitchenOpen = kitchenResp.isOpen;
                    shouldForceRefresh = true;
                    
                    // Update relevant UI components
                    if (currentPage === 'manager') {
                        updateKitchenButton();
                        await loadOrders();
                    } else if (currentPage === 'order') {
                        updateOrderPageDisplay();
                    }
                    
                    showMessage('success', `Kitchen ${kitchenOpen ? 'opened' : 'closed'}!`, 2000);
                    hasChanges = true;
                }
                lastKitchenStatus = kitchenResp.isOpen;
                
                // NEW ORDER DETECTION WITH SOUND
                if (lastOrderCount > 0 && ordersResp.length > lastOrderCount && currentPage === 'manager') {
                    const newOrdersCount = ordersResp.length - lastOrderCount;
                    debugLog(`🔔 NEW ORDERS DETECTED: ${lastOrderCount} → ${ordersResp.length} (+${newOrdersCount})`);
                    
                    // Play sound notification
                    playNewOrderSound();
                    
                    // Show enhanced notification
                    showNewOrderNotification(newOrdersCount);
                    shouldForceRefresh = true;
                    hasChanges = true;
                }
                lastOrderCount = Array.isArray(ordersResp) ? ordersResp.length : 0;
                
                // Order status changes detection
                if (currentHash !== lastDataHash && lastDataHash !== '') {
                    debugLog(`📊 Data changes detected, refreshing UI`);
                    shouldForceRefresh = true;
                    hasChanges = true;
                }
                
                // Tracking page specific monitoring
                if (currentPage === 'tracking') {
                    const trackingOrderId = getOrderIdFromUrl();
                    const currentOrder = ordersResp.find(o => o.id === trackingOrderId) || 
                                       recentResp.find(o => o.id === trackingOrderId);
                    
                    const currentOrderData = currentOrder ? 
                        `${currentOrder.id}-${currentOrder.status}-${currentOrder.timestamp || currentOrder.completedAt}` : 
                        'not-found';
                    
                    if (lastTrackingOrderData && currentOrderData !== lastTrackingOrderData) {
                        debugLog(`📱 Tracked order ${trackingOrderId} changed, updating`);
                        await loadOrderTracking();
                        hasChanges = true;
                    }
                    
                    lastTrackingOrderData = currentOrderData;
                }
                
                // Force refresh manager portal on significant changes
                if (shouldForceRefresh && currentPage === 'manager') {
                    debugLog(`🔄 Force refreshing manager portal`);
                    await loadOrders();
                }
                
                // Update recent orders if there are changes
                if (hasChanges) {
                    await loadRecentOrders();
                }
                
                lastDataHash = currentHash;
                
                if (hasChanges) {
                    debugLog(`✅ Changes processed for ${currentPage} page`);
                }
                
            } catch (error) {
                debugLog('❌ Update error:', error.message);
            }
        }, intervalTime);
    }
    
    function stopEventDrivenUpdates() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
            updateCheckInterval = null;
            debugLog('🛑 Updates stopped');
        }
    }

    // Enhanced update triggers with forced refreshes
    async function triggerUIUpdate(action, data = {}) {
        const currentPage = getCurrentPage();
        debugLog(`🚀 ${action} - forcing immediate UI update`);
        
        try {
            switch (action) {
                case 'ORDER_PLACED':
                    await loadRecentOrders();
                    if (currentPage === 'manager') {
                        await loadOrders();
                    }
                    break;
                    
                case 'ORDER_STATUS_UPDATED':
                    if (currentPage === 'manager') {
                        await loadOrders();
                    }
                    await loadRecentOrders();
                    
                    if (currentPage === 'tracking') {
                        const trackingOrderId = getOrderIdFromUrl();
                        if (trackingOrderId === data.orderId) {
                            debugLog(`📱 Immediately refreshing tracking page for order ${data.orderId}`);
                            await loadOrderTracking();
                        }
                    }
                    
                    if (data.orderId) {
                        lastTrackingOrderData = `${data.orderId}-${data.newStatus}-${new Date().getTime()}`;
                    }
                    break;
                    
                case 'KITCHEN_STATUS_CHANGED':
                    kitchenOpen = data.isOpen;
                    
                    if (currentPage === 'manager') {
                        updateKitchenButton();
                        await loadOrders();
                    } else if (currentPage === 'order') {
                        updateOrderPageDisplay();
                    }
                    
                    showMessage('success', `Kitchen ${data.isOpen ? 'opened' : 'closed'}!`, 2000);
                    debugLog(`🏪 Kitchen status updated to: ${data.isOpen}`);
                    break;
                    
                case 'ORDERS_CLEARED':
                    if (currentPage === 'manager') {
                        await loadOrders();
                    }
                    await loadRecentOrders();
                    
                    if (currentPage === 'tracking') {
                        debugLog(`🗑️ Orders cleared, updating tracking page`);
                        await loadOrderTracking();
                    }
                    break;
                    
                case 'ORDER_DELETED':
                    if (currentPage === 'manager') {
                        await loadOrders();
                    }
                    await loadRecentOrders();
                    
                    if (currentPage === 'tracking') {
                        const trackingOrderId = getOrderIdFromUrl();
                        if (trackingOrderId === data.orderId) {
                            debugLog(`🗑️ Order ${data.orderId} deleted, showing message on tracking page`);
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
                    break;
            }
        } catch (error) {
            debugLog(`❌ Error in ${action}:`, error.message);
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
            
            await triggerUIUpdate('ORDER_DELETED', { orderId });
            
            debugLog(`[DELETE ORDER] UI updated after deletion`);
            
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
            
            await setKitchenStatus(kitchenOpen);
            
            await triggerUIUpdate('KITCHEN_STATUS_CHANGED', { isOpen: kitchenOpen });
            
            debugLog(`[KITCHEN] Status changed from ${previousStatus} to ${kitchenOpen}`);
            
        } catch (error) {
            console.error('Failed to update kitchen status:', error.message);
            kitchenOpen = !kitchenOpen;
            updateKitchenButton();
            updateOrderPageDisplay();
            showMessage('error', 'Failed to update kitchen status');
        }
    }

    function updateKitchenButton() {
        const button = document.getElementById('kitchenToggle');
        if (button) {
            if (kitchenOpen) {
                button.textContent = 'Close Kitchen';
                button.classList.remove('closed');
            } else {
                button.textContent = 'Open Kitchen';
                button.classList.add('closed');
            }
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
    }

    function showNewOrderNotification(orderCount = 1) {
        const notification = document.getElementById('newOrderNotification');
        if (notification) {
            // Enhanced notification text
            notification.innerHTML = `🔔 ${orderCount} new order${orderCount > 1 ? 's' : ''} received!`;
            notification.style.display = 'block';
            notification.style.animation = 'pulse 1s infinite';
            notification.style.backgroundColor = '#28A745';
            notification.style.border = '3px solid #000';
            notification.style.fontWeight = '700';
            
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.animation = '';
            }, 8000); // Show for 8 seconds
        }
    }

    function showPage(pageName) {
        // Stop existing updates when changing pages
        stopEventDrivenUpdates();
        
        // Manager portal authentication
        if (pageName === 'manager') {
            if (!authenticateManager()) {
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
            startEventDrivenUpdates();
        } else if (pageName === 'tracking') {
            document.getElementById('trackingPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering - Track Your Order';
            loadOrderTracking();
            loadRecentOrders();
            startEventDrivenUpdates();
        } else {
            document.getElementById('orderPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering';
            checkKitchenStatus();
            loadRecentOrders();
            startEventDrivenUpdates();
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
            
            await triggerUIUpdate('ORDER_STATUS_UPDATED', { orderId, newStatus });
            
            debugLog(`[UPDATE STATUS] UI updated for affected views`);
            
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
            
            await triggerUIUpdate('ORDERS_CLEARED');
            
            debugLog(`[CLEAR ORDERS] All orders cleared and UI updated`);
            
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
        
        debugLog(`[INIT] Application initialized on ${currentPage} page with reduced-frequency updates`);
    }

    // Enhanced Event Listeners
    function setupEventListeners() {
        // Order form handling
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Placing Order...';
                
                try {
                    const formData = new FormData(this);
                    const order = {
                        food: formData.get('food'),
                        room: formData.get('room'),
                        name: formData.get('name'),
                        comments: formData.get('comments') || ''
                    };
                    
                    const response = await addOrder(order);
                    this.reset();
                    
                    debugLog(`[NEW ORDER] Order placed successfully: ${response.order?.id}`);
                    
                    await triggerUIUpdate('ORDER_PLACED', { orderId: response.order?.id });
                    
                    if (response.order && response.order.id) {
                        setTimeout(() => {
                            window.location.href = `?id=${response.order.id}`;
                        }, 500);
                    } else {
                        showMessage('success', 'Order placed successfully!');
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

        // FIXED: Triple click detection for manager access
        let clickCount = 0;
        let clickTimer = null;
        const header = document.querySelector('.header');
        if (header) {
            header.addEventListener('click', function() {
                clickCount++;
                
                // Clear existing timer
                if (clickTimer) {
                    clearTimeout(clickTimer);
                }
                
                // Check for triple click
                if (clickCount === 3) {
                    debugLog('[MANAGER ACCESS] Triple click detected - showing manager link');
                    const managerLink = document.getElementById('managerAccess');
                    if (managerLink) {
                        managerLink.style.display = 'block';
                        managerLink.style.opacity = '1';
                        managerLink.style.transition = 'opacity 0.3s ease';
                        
                        // Hide after 10 seconds
                        setTimeout(() => {
                            if (managerLink.style.display === 'block') {
                                managerLink.style.opacity = '0';
                                setTimeout(() => {
                                    managerLink.style.display = 'none';
                                }, 300);
                            }
                        }, 10000);
                    }
                    clickCount = 0; // Reset immediately
                } else {
                    // Set timer to reset click count after 800ms
                    clickTimer = setTimeout(() => {
                        clickCount = 0;
                    }, 800);
                }
            });
        }

        // Manager access link click handler
        const managerLink = document.getElementById('managerAccess');
        if (managerLink) {
            managerLink.addEventListener('click', function(e) {
                e.preventDefault();
                debugLog('[MANAGER ACCESS] Manager link clicked');
                
                // Hide the link immediately
                this.style.display = 'none';
                
                // Navigate to manager page
                window.location.href = '?page=manager';
            });
        }
    }

    // Global function assignments for onclick handlers
    window.toggleKitchenStatus = toggleKitchenStatus;
    window.loadOrders = loadOrders;
    window.clearAllOrders = clearAllOrders;
    window.logoutManager = logoutManager;
    window.goToOrderPage = goToOrderPage;

    // Enhanced cleanup and navigation handling
    window.addEventListener('beforeunload', function() {
        stopEventDrivenUpdates();
        debugLog('[CLEANUP] Stopping updates before page unload');
    });
    
    window.addEventListener('popstate', function() {
        debugLog('[NAVIGATION] Popstate detected - reinitializing');
        init();
    });
    
    // Handle visibility changes to pause/resume updates when tab is hidden/shown
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            debugLog('[VISIBILITY] Tab hidden - updates will pause');
        } else {
            debugLog('[VISIBILITY] Tab visible - updates will resume');
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
            console.log('📊 Request Reduction Summary:');
            console.log('🕒 Update Intervals:', UPDATE_INTERVALS);
            console.log('🔄 Manager page: 20 seconds (was 3 seconds)');
            console.log('📱 Tracking page: 15 seconds (was 2 seconds)');
            console.log('📝 Order page: 1 minute (was 5 seconds)');
            console.log('🔊 Sound notifications enabled for new orders');
        }
    }, 1000);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupActivityTracking();
            setupEventListeners();
            init();
            debugLog('[STARTUP] Application fully loaded with reduced-frequency updates and sound notifications');
        });
    } else {
        setupActivityTracking();
        setupEventListeners();
        init();
        debugLog('[STARTUP] Application fully loaded with reduced-frequency updates and sound notifications');
    }

})();