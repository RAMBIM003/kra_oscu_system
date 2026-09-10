(function () {

    var trigger = document.getElementById('etims-chatbot-trigger');
    var panel = document.getElementById('etims-chatbot-panel');
    var closeBtn = document.getElementById('etims-chatbot-close');
    var tabs = document.querySelectorAll('.etims-chatbot-tab');

    var tabPanels = {
        home: document.getElementById('etims-chatbot-tab-home'),
        messages: document.getElementById('etims-chatbot-tab-messages'),
        help: document.getElementById('etims-chatbot-tab-help')
    };

    if (!trigger || !panel) {
        return;
    }

    function openPanel() {
        panel.classList.remove('hidden');
    }

    function closePanel() {
        panel.classList.add('hidden');
    }

    trigger.addEventListener('click', function () {
        panel.classList.contains('hidden') ? openPanel() : closePanel();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closePanel);
    }

    tabs.forEach(function (tabBtn) {
        tabBtn.addEventListener('click', function () {
            var target = tabBtn.getAttribute('data-tab');

            tabs.forEach(function (t) {
                t.classList.remove('active');
            });
            tabBtn.classList.add('active');

            Object.keys(tabPanels).forEach(function (key) {
                if (!tabPanels[key]) {
                    return;
                }
                if (key === target) {
                    tabPanels[key].classList.remove('hidden');
                } else {
                    tabPanels[key].classList.add('hidden');
                }
            });
        });
    });

    var searchInput = document.getElementById('etims-chatbot-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var query = searchInput.value.trim().toLowerCase();
            var articles = document.querySelectorAll('.etims-chatbot-article');

            articles.forEach(function (article) {
                var text = article.textContent.trim().toLowerCase();
                article.style.display = text.indexOf(query) !== -1 ? '' : 'none';
            });
        });
    }

})();
