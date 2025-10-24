// Filter state management with localStorage persistence
(function() {
    const STORAGE_KEY = 'beads-filters';

    // Load saved filters from localStorage
    function loadFilters() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading filters:', e);
            return {};
        }
    }

    // Save current filters to localStorage
    function saveFilters() {
        try {
            const filters = {
                search: document.getElementById('search')?.value || '',
                status: document.getElementById('status')?.value || '',
                priority: document.getElementById('priority')?.value || '',
                type: document.getElementById('type')?.value || '',
                sort: document.getElementById('sort')?.value || 'updated',
                order: document.getElementById('order')?.value || 'desc'
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
        } catch (e) {
            console.error('Error saving filters:', e);
        }
    }

    // Apply saved filters on page load
    function applySavedFilters() {
        const filters = loadFilters();

        if (filters.search && document.getElementById('search')) {
            document.getElementById('search').value = filters.search;
        }
        if (filters.status && document.getElementById('status')) {
            document.getElementById('status').value = filters.status;
        }
        if (filters.priority && document.getElementById('priority')) {
            document.getElementById('priority').value = filters.priority;
        }
        if (filters.type && document.getElementById('type')) {
            document.getElementById('type').value = filters.type;
        }
        if (filters.sort && document.getElementById('sort')) {
            document.getElementById('sort').value = filters.sort;
        }
        if (filters.order && document.getElementById('order')) {
            document.getElementById('order').value = filters.order;
        }

        // Update sort indicators
        updateSortIndicators(filters.sort, filters.order);

        // Trigger initial filter if any filters are set
        if (filters.search || filters.status || filters.priority || filters.type) {
            const filterDiv = document.querySelector('.filters');
            if (filterDiv) {
                htmx.trigger(filterDiv, 'change');
            }
        }
    }

    // Update visual sort indicators in table headers
    function updateSortIndicators(sortField, sortOrder) {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('active', 'asc', 'desc');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = '';
            }
        });

        const activeHeader = document.querySelector(`th.sortable[data-sort="${sortField}"]`);
        if (activeHeader) {
            activeHeader.classList.add('active', sortOrder);
            const indicator = activeHeader.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = sortOrder === 'asc' ? '▲' : '▼';
            }
        }
    }

    // Handle table header clicks for sorting
    function setupSorting() {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', function() {
                const sortField = this.getAttribute('data-sort');
                const currentSort = document.getElementById('sort')?.value;
                const currentOrder = document.getElementById('order')?.value;

                let newOrder = 'desc';
                if (currentSort === sortField) {
                    newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                }

                document.getElementById('sort').value = sortField;
                document.getElementById('order').value = newOrder;

                updateSortIndicators(sortField, newOrder);
                saveFilters();

                const filterDiv = document.querySelector('.filters');
                if (filterDiv) {
                    htmx.trigger(filterDiv, 'change');
                }
            });
        });
    }

    // Save filters whenever they change
    function setupFilterListeners() {
        ['search', 'status', 'priority', 'type'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.addEventListener('change', saveFilters);
                elem.addEventListener('input', saveFilters);
            }
        });
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        applySavedFilters();
        setupSorting();
        setupFilterListeners();
    });

    // Re-setup sorting after htmx swaps content
    document.body.addEventListener('htmx:afterSwap', function() {
        const filters = loadFilters();
        updateSortIndicators(filters.sort || 'updated', filters.order || 'desc');
    });
})();

// Live reload WebSocket connection (dev mode only)
(function() {
    if (window.location.host.includes('127.0.0.1') || window.location.host.includes('localhost')) {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host + '/ws';
            const ws = new WebSocket(wsUrl);

            ws.onmessage = function(event) {
                if (event.data === 'reload') {
                    console.log('Live reload triggered');
                    window.location.reload();
                }
            };

            ws.onerror = function() {
                // Silently ignore WebSocket errors (likely not in dev mode)
            };

            ws.onclose = function() {
                // Don't auto-reload on close, as this might not be dev mode
            };
        } catch (e) {
            // Silently ignore if WebSocket is not available
        }
    }
})();
