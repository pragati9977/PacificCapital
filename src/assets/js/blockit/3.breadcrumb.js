/* breadcrumb.js | https://www.indonez.com | Indonez | MIT License */
function breadcrumb(options) {
    'use strict';

    // Default settings
    const defaults = {
        homeTitle: 'Home',                          // home or root of your breadcrumb title
        breadcrumbElement: 'uk-breadcrumb',         // breadcrumb element that use in HTML
        articleElement: 'in-article',               // article element wrapper that use in HTML
        titleElement: 'h2',                         // heading element that used for main title of article
        blogTitle: 'blog',                          // your HTML title in blog page/article must have "blog" word
        truncate: true,                             // truncate option in breadcrumb article if you think to long
        truncateWords: 40                           // the number of words you want to truncate
    };

    // Merge user options into defaults
    const settings = Object.assign({}, defaults, options);

    // Check if element exist
    if (document.querySelector(`.${settings.breadcrumbElement}`) !== null) {
        // Required variables
        const breadcrumb = document.querySelector(`.${settings.breadcrumbElement}`);
        const navbar = document.querySelector('.uk-navbar-nav');
        const breadcrumbHome = navbar.children[0].getElementsByTagName('a')[0].pathname;
        const breadcrumbTitle = navbar.querySelectorAll('li.uk-active');
        const pageTitleName = document.title.toLowerCase();
        let createLiElement;

        // Set of functions
        const breadcrumbMethods = {
            createBreadcrumb: function () {
                breadcrumb.innerHTML = `<li><a href="${breadcrumbHome.slice(location.pathname.lastIndexOf('/') + 1)}">${settings.homeTitle}</a></li>`;
                breadcrumbTitle.forEach(function(e) {
                    createLiElement = document.createElement('li');
                    createLiElement.innerHTML =`<a href="${e.querySelector('a').attributes[0].textContent}">${e.querySelector('a').innerText}</a>`;
                    breadcrumb.appendChild(createLiElement);
                })
                
            },
            createBreadcrumbLast: function () {
                const lastLiElement = breadcrumb.children[breadcrumb.childNodes.length-1];
                createLiElement = document.createElement('li');

                if (lastLiElement) {
                    lastLiElement.remove();
                    createLiElement.innerHTML = `<span>${lastLiElement.innerText}</span>`; 
                    breadcrumb.appendChild(createLiElement);
                }
            },
            createBreadcrumbBlog: function (pathParam) {
                if (pageTitleName.includes(settings.blogTitle)) {
                    const createLiArticle = document.createElement('li');
                    const addActive = navbar.querySelectorAll('li a');

                    breadcrumb.innerHTML = `<li><a href="${pathParam}">${settings.homeTitle}</a></li>`;

                    addActive.forEach(function(e) {
                        if (e.innerText.toLowerCase() == settings.blogTitle) {
                            const urlParams = window.location.href.split( '/' )
                            const currentPage = urlParams.pop()
                            const levelOne = document.createElement('li');
                            const levelTwo = document.createElement('li');

                            e.parentNode.classList.add('uk-active');
                            levelOne.innerHTML = `<a href="${e.parentNode.parentNode.parentNode.parentNode.querySelector('a')}">${e.parentNode.parentNode.parentNode.parentNode.querySelector('a').innerText}</a>`;
                            levelTwo.innerHTML = `<a href="${e}">${e.innerText}</a>`;

                            if (!(e.parentNode.parentNode.parentNode.parentNode.classList.contains('uk-container'))) {
                                e.parentNode.parentNode.parentNode.parentNode.classList.add('uk-active');
                                breadcrumb.appendChild(levelOne);
                            }

                            if (currentPage.substring(0,4) == 'page' || currentPage.substring(0,4) == 'find' && !document.querySelector(`.${settings.articleElement}`)) {
                                levelTwo.innerHTML = `<span><a href="${e}">${e.innerText}</a></span>`;
                            }

                            breadcrumb.appendChild(levelTwo);
                        }
                    })

                    // condition for single post
                    if (document.querySelector(`.${settings.articleElement}`) !== null) {
                        let articleTitle = document.querySelector(`.${settings.articleElement}`).querySelector(settings.titleElement).innerText;

                        articleTitle = settings.truncate ? breadcrumbMethods.truncateBreadcrumb(articleTitle, settings.truncateWords) : articleTitle;
                        createLiArticle.innerHTML = `<span>${articleTitle}</span>`;
                        breadcrumb.appendChild(createLiArticle);
                    }
                }
            },
            truncateBreadcrumb: function (string, number) {
                let cut = string.indexOf(' ', number);
                if(cut == -1) return string;
                return string.substring(0, cut) + ' ...'
            },
            init: function () {
                breadcrumbMethods.createBreadcrumb();
                breadcrumbMethods.createBreadcrumbLast();
                breadcrumbMethods.createBreadcrumbBlog(breadcrumbHome);
            }
        };
        breadcrumbMethods.init();
    }
};
breadcrumb();