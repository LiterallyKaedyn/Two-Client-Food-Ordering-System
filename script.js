// script.js - Optimized Food Ordering System with Rate Limiting
// Fixed excessive API calls and added proper rate limiting with notifications

(function() {
    'use strict';
    
    // ========== RATE LIMITING SYSTEM ==========
    
    const RATE_LIMITS = {
        maxRequestsPerMinute: 20, // Very conservative
        maxRequestsPerHour: 200,  // Reduced further
        burstLimit: 3,            // Reduced burst limit
        cooldownMs: 3000          // Longer cooldown
    };
    
    let requestTracker = {
        minuteRequests: [],
        hourRequests: [],
        lastBurstTime: 0,
        burstCount: 0,
        isRateLimited: false
    };
    
    // Rate limit notification system
    function showRateLimitNotification(message, type = 'warning') {
        // Remove existing notification
        const existing = document.getElementById('rate-limit-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'rate-limit-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#ffc107'};
            color: ${type === 'error' ? 'white' : '#000'};
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #000;
            max-width: 300px;
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${type === 'error' ? '🚫' : '⚠️'}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    function checkRateLimit() {
        const now = Date.now();
        
        // Clean old entries
        requestTracker.minuteRequests = requestTracker.minuteRequests.filter(time => now - time < 60000);
        requestTracker.hourRequests = requestTracker.hourRequests.filter(time => now - time < 3600000);
        
        // Check burst limiting
        if (now - requestTracker.lastBurstTime < RATE_LIMITS.cooldownMs) {
            requestTracker.burstCount++;
            if (requestTracker.burstCount > RATE_LIMITS.burstLimit) {
                showRateLimitNotification('Slow down! Too many requests too quickly.', 'warning');
                return false;
            }
        } else {
            requestTracker.burstCount = 0;
        }
        
        // Check minute limit
        if (requestTracker.minuteRequests.length >= RATE_LIMITS.maxRequestsPerMinute) {
            showRateLimitNotification('Rate limited: Max requests per minute reached', 'error');
            requestTracker.isRateLimited = true;
            return false;
        }
        
        // Check hour limit
        if (requestTracker.hourRequests.length >= RATE_LIMITS.maxRequestsPerHour) {
            showRateLimitNotification('Rate limited: Hourly request limit reached', 'error');
            requestTracker.isRateLimited = true;
            return false;
        }
        
        // Rate limit passed
        requestTracker.minuteRequests.push(now);
        requestTracker.hourRequests.push(now);
        requestTracker.lastBurstTime = now;
        requestTracker.isRateLimited = false;
        
        return true;
    }
    
    // ========== AUTHENTICATION SYSTEM ==========
    
    // Obfuscated authentication data
    const AUTH_CONFIG = {
        key: 'S2FlZHluSXNDb29s',
        salt: 'food_mgr_2025',
        sessionKey: 'manager_session_v2'
    };
    
    const SESSION_DURATION = 60 * 60 * 1000;
    const ACTIVITY_TIMEOUT = 60 * 60 * 1000;
    
    function getAuthKey() {
        try {
            return atob(AUTH_CONFIG.key);
        } catch (e) {
            return null;
        }
    }
    
    function validateCredentials(input) {
        if (!input || typeof input !== 'string') return false;
        const expected = getAuthKey();
        if (!expected) return false;
        return input === expected;
    }
    
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
    
    function setupActivityTracking() {
        setupUserActivityTracking(); // Add user activity tracking
        
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
        
        debugLog(`⚡ Response Time: ${responseTime.toFixed(2)}ms (Avg: ${performanceMetrics.averageResponseTime.toFixed(2)}ms)`);
    }

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

    // ========== EVENT-DRIVEN UPDATE SYSTEM ==========
    
    let lastDataCache = {
        orders: null,
        recentOrders: null,
        kitchenStatus: null,
        lastUpdate: 0,
        orderHashes: new Map(), // Track individual order states
        lastOrderCount: 0,
        lastKitchenStatus: null
    };
    
    let updateCheckInterval;
    let userInteractionTime = Date.now();
    let isUserActive = true;
    
    // Only check for changes every 30 seconds - but only request data if changes detected
    const CHANGE_CHECK_INTERVAL = 30000;
    const CACHE_DURATION = 60000; // 1 minute cache
    
    // Track user activity
    function updateUserActivity() {
        userInteractionTime = Date.now();
        isUserActive = true;
    }
    
    function setupUserActivityTracking() {
        const events = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart', 'focus'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, updateUserActivity, { passive: true });
        });
        
        // Check if user has been idle for 10 minutes
        setInterval(() => {
            const idleTime = Date.now() - userInteractionTime;
            const wasActive = isUserActive;
            isUserActive = idleTime < 600000; // 10 minutes
            
            if (wasActive && !isUserActive) {
                debugLog('[ACTIVITY] User went idle - stopping all updates');
                stopSmartUpdates();
            } else if (!wasActive && isUserActive) {
                debugLog('[ACTIVITY] User became active - resuming smart updates');
                const currentPage = getCurrentPage();
                if (currentPage === 'manager' || currentPage === 'tracking') {
                    startSmartUpdates();
                }
            }
        }, 60000);
    }
    
    // Create a lightweight "change detection" endpoint that returns minimal data
    async function checkForChanges() {
        if (!checkRateLimit()) {
            debugLog('[RATE LIMIT] Skipping change check');
            return null;
        }
        
        try {
            const startTime = performance.now();
            
            // Make a very lightweight request to get just the summary
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orders = await response.json();
            
            trackPerformance(startTime);
            
            // Create a simple hash of the current state
            const currentState = {
                orderCount: Array.isArray(orders) ? orders.length : 0,
                orderIds: Array.isArray(orders) ? orders.map(o => o.id).sort().join(',') : '',
                orderStatuses: Array.isArray(orders) ? orders.map(o => `${o.id}:${o.status}`).join('|') : ''
            };
            
            return { orders, currentState };
        } catch (error) {
            debugLog('[CHANGE CHECK] Error:', error.message);
            return null;
        }
    }
    
    // Only fetch full data when we detect actual changes
    async function fetchDataIfChanged(changeData) {
        const { orders, currentState } = changeData;
        const currentPage = getCurrentPage();
        
        let needsUpdate = false;
        let updateReason = '';
        
        // Check if order count changed
        if (currentState.orderCount !== lastDataCache.lastOrderCount) {
            needsUpdate = true;
            updateReason = `Order count: ${lastDataCache.lastOrderCount} → ${currentState.orderCount}`;
        }
        
        // Check if any order statuses changed
        const lastOrderStatuses = lastDataCache.orderStatuses || '';
        if (currentState.orderStatuses !== lastOrderStatuses) {
            needsUpdate = true;
            updateReason = updateReason || 'Order status changed';
        }
        
        // For tracking page, only care about the specific order being tracked
        if (currentPage === 'tracking') {
            const orderId = getOrderIdFromUrl();
            if (orderId) {
                const currentOrder = orders.find(o => o.id === orderId);
                const lastOrderHash = lastDataCache.orderHashes.get(orderId);
                const currentOrderHash = currentOrder ? `${currentOrder.status}-${currentOrder.timestamp}` : 'not-found';
                
                if (currentOrderHash !== lastOrderHash) {
                    needsUpdate = true;
                    updateReason = `Tracked order ${orderId} changed`;
                    lastDataCache.orderHashes.set(orderId, currentOrderHash);
                }
            }
        }
        
        // Update our tracking variables
        lastDataCache.lastOrderCount = currentState.orderCount;
        lastDataCache.orderStatuses = currentState.orderStatuses;
        
        if (needsUpdate) {
            debugLog(`[SMART UPDATE] ${updateReason} - fetching fresh data`);
            
            // Now fetch the additional data we need
            const promises = [];
            
            // Get recent orders
            promises.push(
                fetch('/api/orders?completed-orders=true')
                    .then(r => r.json())
                    .catch(() => [])
            );
            
            // Get kitchen status (only for manager)
            if (currentPage === 'manager') {
                promises.push(
                    fetch('/api/orders?kitchen-status=true')
                        .then(r => r.json())
                        .catch(() => ({ isOpen: false }))
                );
            }
            
            const [recentOrders, kitchenStatus] = await Promise.all(promises);
            
            // Update UI based on what changed
            if (currentPage === 'manager') {
                await loadOrders();
                
                // Check kitchen status
                if (kitchenStatus && kitchenStatus.isOpen !== lastDataCache.lastKitchenStatus) {
                    kitchenOpen = kitchenStatus.isOpen;
                    updateKitchenButton();
                    showMessage('success', `Kitchen ${kitchenOpen ? 'opened' : 'closed'}!`);
                    lastDataCache.lastKitchenStatus = kitchenStatus.isOpen;
                }
                
                // Check for new orders
                if (currentState.orderCount > lastDataCache.lastOrderCount && lastDataCache.lastOrderCount > 0) {
                    showNewOrderNotification();
                }
            } else if (currentPage === 'tracking') {
                await loadOrderTracking();
            }
            
            // Always update recent orders if there are changes
            await loadRecentOrders();
            
            return true;
        } else {
            debugLog('[SMART UPDATE] No changes detected - skipping data fetch');
            return false;
        }
    }
    
    function startSmartUpdates() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
        }
        
        const currentPage = getCurrentPage();
        
        // Only manager and tracking pages get smart updates
        if (currentPage !== 'manager' && currentPage !== 'tracking') {
            debugLog('[SMART UPDATES] No updates needed for order page');
            return;
        }
        
        debugLog(`[SMART UPDATES] Starting change detection for ${currentPage} page`);
        
        updateCheckInterval = setInterval(async () => {
            // Skip if tab is hidden, user is idle, or rate limited
            if (document.hidden || !isUserActive || requestTracker.isRateLimited) {
                return;
            }
            
            try {
                // Step 1: Check for changes (lightweight request)
                const changeData = await checkForChanges();
                if (!changeData) return;
                
                // Step 2: Only fetch full data if changes detected
                await fetchDataIfChanged(changeData);
                
            } catch (error) {
                debugLog('[SMART UPDATES] Error:', error.message);
            }
        }, CHANGE_CHECK_INTERVAL);
    }
    
    function stopSmartUpdates() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
            updateCheckInterval = null;
            debugLog('[SMART UPDATES] Stopped');
        }
    }
    
    function stopOptimizedUpdates() {
        if (updateCheckInterval) {
            clearInterval(updateCheckInterval);
            updateCheckInterval = null;
            debugLog('[UPDATES] Stopped');
        }
    }

    // ========== API FUNCTIONS WITH RATE LIMITING ==========
    
    async function rateLimitedFetch(url, options = {}) {
        if (!checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }
        
        const startTime = performance.now();
        const response = await fetch(url, options);
        trackPerformance(startTime);
        
        return response;
    }
    
    async function getOrders() {
        try {
            debugLog('Fetching orders from /api/orders');
            const response = await rateLimitedFetch('/api/orders');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orders = await response.json();
            debugLog('Orders received:', orders.length, 'orders');
            return { orders: Array.isArray(orders) ? orders : [] };
        } catch (error) {
            console.error('Failed to get orders:', error.message);
            throw error;
        }
    }

    async function addOrder(order) {
        try {
            debugLog('Adding order:', order.food, 'for', order.name);

            const response = await rateLimitedFetch('/api/orders', {
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
        try {
            const updateData = { status };
            if (status === 'completed') {
                updateData.completedAt = getNZTime();
            }

            debugLog(`[API CALL] PUT /api/orders?update-order=${id} with status: ${status}`);
            const response = await rateLimitedFetch(`/api/orders?update-order=${id}`, {
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
            debugLog(`[API CALL] Success Response:`, result);
            
            // Clear cache to force refresh
            lastDataCache.orders = null;
            lastDataCache.recentOrders = null;
            
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
            
            // Force refresh
            lastDataCache.orders = null;
            lastDataCache.recentOrders = null;
            await loadOrders();
            await loadRecentOrders();
            
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
        try {
            debugLog(`[API CALL] DELETE /api/orders?delete-order=${orderId}`);
            const response = await rateLimitedFetch(`/api/orders?delete-order=${orderId}`, {
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
            debugLog(`[API CALL] Delete Success Response:`, result);
            return result;
        } catch (error) {
            debugLog('[API CALL] Delete Exception:', error);
            throw error;
        }
    }

    async function clearOrders() {
        try {
            debugLog('Clearing all orders');
            const response = await rateLimitedFetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([])
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            debugLog('Orders cleared successfully');
            
            // Clear cache
            lastDataCache.orders = null;
            lastDataCache.recentOrders = null;
            
            return result;
        } catch (error) {
            console.error('Failed to clear orders:', error.message);
            throw error;
        }
    }

    async function getKitchenStatus() {
        try {
            debugLog('Fetching kitchen status');
            const response = await rateLimitedFetch('/api/orders?kitchen-status=true');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const status = await response.json();
            debugLog('Kitchen status:', status.isOpen ? 'Open' : 'Closed');
            return status;
        } catch (error) {
            console.error('Failed to get kitchen status:', error.message);
            return { isOpen: false };
        }
    }

    async function setKitchenStatus(isOpen) {
        try {
            debugLog('Setting kitchen status to:', isOpen ? 'Open' : 'Closed');
            const response = await rateLimitedFetch('/api/orders?kitchen-status=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isOpen })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            debugLog('Kitchen status updated successfully');
            
            // Clear cache
            lastDataCache.kitchenStatus = null;
            
            return result;
        } catch (error) {
            console.error('Failed to set kitchen status:', error.message);
            throw error;
        }
    }

    async function getRecentOrders() {
        try {
            debugLog('Fetching recent orders');
            const response = await rateLimitedFetch('/api/orders?completed-orders=true');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const orders = await response.json();
            debugLog('Recent orders received:', orders.length, 'orders');
            return { orders: Array.isArray(orders) ? orders : [] };
        } catch (error) {
            console.error('Failed to get recent orders:', error.message);
            return { orders: [] };
        }
    }

    // ========== KITCHEN STATUS MANAGEMENT ==========
    
    let kitchenOpen = false;

    async function toggleKitchenStatus() {
        try {
            const previousStatus = kitchenOpen;
            kitchenOpen = !kitchenOpen;
            
            await setKitchenStatus(kitchenOpen);
            updateKitchenButton();
            updateOrderPageDisplay();
            
            showMessage('success', `Kitchen ${kitchenOpen ? 'opened' : 'closed'}!`);
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

    function showNewOrderNotification() {
        const notification = document.getElementById('newOrderNotification');
        if (notification) {
            notification.style.display = 'block';
            
            try {
                new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhDjWCyPPPfTIGHm7A7+OZSA0NVqzn77NdGAg+ltryxnkpBSl+zPLaizsIGGS57OOYTgwOUarm7bliFg06kdDzyn0vBSF0xe/glEILElyx6OyrWBUIQ5zd8sFuIAU2jdXzzn1uBiJ0xe/glEILElyx6OyrWBUIQ5zd8sFuIAU2jdXzzn1uBg==').play().catch(() => {});
            } catch (e) {}
            
            notification.style.animation = 'pulse 0.5s infinite';
            
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.animation = '';
            }, 5000);
        }
    }

    // ========== PAGE MANAGEMENT ==========
    
    function showPage(pageName) {
        stopSmartUpdates();
        
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
            startSmartUpdates(); // Smart updates for new orders
        } else if (pageName === 'tracking') {
            document.getElementById('trackingPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering - Track Your Order';
            
            // Add refresh button to tracking page if it doesn't exist
            const trackingContainer = document.querySelector('#trackingPage .order-tracking');
            if (trackingContainer && !trackingContainer.querySelector('.manual-refresh-btn')) {
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'manual-refresh-btn';
                refreshBtn.style.cssText = `
                    background: #17A2B8; 
                    color: white; 
                    border: 3px solid #000; 
                    padding: 10px 20px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    margin: 20px auto; 
                    display: block;
                    font-weight: 700;
                    transition: all 0.3s ease;
                `;
                refreshBtn.textContent = '🔄 Refresh Status';
                refreshBtn.onclick = manualRefresh;
                trackingContainer.insertBefore(refreshBtn, trackingContainer.firstChild);
            }
            
            loadOrderTracking();
            loadRecentOrders();
            startSmartUpdates(); // Smart updates for order status changes
        } else {
            document.getElementById('orderPage').classList.add('active');
            document.getElementById('headerSubtitle').textContent = '48 Hour Food Festival Catering';
            
            // Add refresh button to order page if it doesn't exist
            const orderContainer = document.getElementById('orderFormContainer');
            if (orderContainer && !orderContainer.querySelector('.manual-refresh-btn')) {
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'manual-refresh-btn';
                refreshBtn.style.cssText = `
                    background: #17A2B8; 
                    color: white; 
                    border: 3px solid #000; 
                    padding: 10px 20px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    margin: 20px 0; 
                    display: block;
                    font-weight: 700;
                    transition: all 0.3s ease;
                    width: 100%;
                `;
                refreshBtn.textContent = '🔄 Refresh Kitchen Status';
                refreshBtn.onclick = manualRefresh;
                orderContainer.appendChild(refreshBtn);
            }
            
            checkKitchenStatus();
            loadRecentOrders();
            // NO automatic updates for order page
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

    // ========== MANAGER FUNCTIONS ==========
    
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
            
            // Update our tracking
            if (lastDataCache) {
                lastDataCache.lastOrderCount = orders.length;
            }
            
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
            
            // Force refresh of orders
            await loadOrders();
            await loadRecentOrders();
            
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
            
            // Force refresh
            await loadOrders();
            await loadRecentOrders();
            
            debugLog(`[CLEAR ORDERS] All orders cleared and UI updated`);
            
        } catch (error) {
            console.error('Clear orders error:', error.message);
            showMessage('error', 'Failed to clear orders. Please try again.');
        }
    }

    // ========== ORDER TRACKING FUNCTIONS ==========
    
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

    // ========== MANUAL REFRESH FUNCTIONS ==========
    
    async function manualRefresh() {
        const currentPage = getCurrentPage();
        
        try {
            showMessage('success', 'Refreshing...', 1000);
            
            if (currentPage === 'tracking') {
                await loadOrderTracking();
            } else if (currentPage === 'order') {
                await checkKitchenStatus();
            }
            
            await loadRecentOrders();
            
            // Clear cache to force fresh data
            lastDataCache.orders = null;
            lastDataCache.recentOrders = null;
            lastDataCache.kitchenStatus = null;
            
        } catch (error) {
            showMessage('error', 'Failed to refresh. Please try again.');
        }
    }
    
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

    // ========== INITIALIZATION ==========
    
    function init() {
        const currentPage = getCurrentPage();
        
        // Reset tracking variables
        lastDataCache = {
            orders: null,
            recentOrders: null,
            kitchenStatus: null,
            lastUpdate: 0,
            orderHashes: new Map(),
            lastOrderCount: 0,
            lastKitchenStatus: null,
            orderStatuses: ''
        };
        
        showPage(currentPage);
        
        debugLog(`[INIT] Application initialized on ${currentPage} page with smart updates`);
    }

    // ========== EVENT LISTENERS ==========
    
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
                    
                    // Clear cache to ensure fresh data
                    lastDataCache.orders = null;
                    lastDataCache.recentOrders = null;
                    
                    if (response.order && response.order.id) {
                        setTimeout(() => {
                            window.location.href = `?id=${response.order.id}`;
                        }, 500);
                    } else {
                        showMessage('success', 'Order placed successfully!');
                    }
                    
                } catch (error) {
                    console.error('Order submission error:', error.message);
                    if (error.message.includes('Rate limit')) {
                        showMessage('error', 'Please wait a moment before placing another order.');
                    } else {
                        const errorMessage = error.message?.includes('HTTP 500') 
                            ? 'Server error. Please check your API configuration and try again.' 
                            : 'Failed to place order. Please try again.';
                        showMessage('error', errorMessage);
                    }
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
                        
                        // Hide after 10 seconds instead of 5
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
                    // Set timer to reset click count after 800ms (reduced from 1000ms)
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

    // ========== GLOBAL FUNCTIONS ==========
    
    window.toggleKitchenStatus = toggleKitchenStatus;
    window.loadOrders = loadOrders;
    window.clearAllOrders = clearAllOrders;
    window.logoutManager = logoutManager;
    window.goToOrderPage = goToOrderPage;
    window.manualRefresh = manualRefresh;

    // ========== CLEANUP AND NAVIGATION ==========
    
    window.addEventListener('beforeunload', function() {
        stopSmartUpdates();
        debugLog('[CLEANUP] Stopping updates before page unload');
    });
    
    window.addEventListener('popstate', function() {
        debugLog('[NAVIGATION] Popstate detected - reinitializing');
        init();
    });
    
    // Handle visibility changes to pause/resume updates when tab is hidden/shown
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            debugLog('[VISIBILITY] Tab hidden - smart updates will pause');
        } else {
            debugLog('[VISIBILITY] Tab visible - smart updates will resume');
            // Force a quick update when tab becomes visible again
            setTimeout(async () => {
                const currentPage = getCurrentPage();
                if (currentPage === 'manager' || currentPage === 'tracking') {
                    const changeData = await checkForChanges();
                    if (changeData) {
                        await fetchDataIfChanged(changeData);
                    }
                }
            }, 1000);
        }
    });
    
    // Show rate limit info on page load
    setTimeout(() => {
        if (DEBUG_MODE) {
            console.log('📊 Rate Limits:', RATE_LIMITS);
            console.log('⚡ Smart Update Interval:', CHANGE_CHECK_INTERVAL + 'ms');
        }
    }, 1000);
    
    // ========== INITIALIZE ==========
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupActivityTracking();
            setupEventListeners();
            init();
            debugLog('[STARTUP] Application fully loaded with rate limiting and optimized updates');
        });
    } else {
        setupActivityTracking();
        setupEventListeners();
        init();
        debugLog('[STARTUP] Application fully loaded with rate limiting and optimized updates');
    }

})();