// gulp plugin
const {task, watch, series} = require('gulp')

// blockit modules
const theme = require('./src/gulp/blockit-theme')
const minify = require('./src/gulp/blockit-minify')

// required plugins
const fs = require('fs')
const del = require('del')
const browsersync = require('browser-sync').create()

// browsersync init
function bsServe() {
    browsersync.init({
        port: 3000,
        ui: false,
        notify: false,
        watch: true,
        startPath: '/blockit',
        server: 'dist',
        serveStatic: ['src'],
        logPrefix: 'Blockit',
        reloadDelay: 3000,
        callbacks: {
            ready: function(err, bs) {
                bs.io.sockets.on('connection', socket => {
                    // Blockit method collections
                    const blockit = {
                        // pages editor
                        pagesListPages: function() {
                            fs.readdir('src/pages', (err, files) => {
                                if(err) return console.log(err)
                                const pagesObj = {data: []}
                                const hbsFiles = files.filter(eachFile => eachFile.match(/.(hbs)$/i))
                                hbsFiles.forEach(file => {
                                    const dataPages = {
                                        name: file.split('.').slice(0, -1).join('.'),
                                        date: fs.statSync(`src/pages/${file}`).mtime,
                                        content: fs.readFileSync(`src/pages/${file}`, {encoding:'utf8', flag:'r'})
                                    }
                                    pagesObj.data.push(dataPages)
                                })
                                socket.emit('listPageData', pagesObj)
                            })
                        },
                        pagesListSections: function() {
                            fs.readdir('src/partials/sections', (err, files) => {
                                if(err) return console.log(err)
                                socket.emit('sectionPageData', files)
                            })
                            const componentData = fs.readFileSync('src/blockit/data/component.json', { encoding: 'utf8', flag: 'r' })
                            socket.emit('sectionComponentData', componentData)
                        },
                        pagesEditPage: function(nameFile) {
                            const data = fs.readFileSync(`src/pages/${nameFile}.hbs`, {encoding:'utf8', flag:'r'})
                            const rgxSection = /(?<={{> )(.*?)(?= }})/g
                            const rgxLayout = /(?<=layout:\s).*/g
                            const rgxTitle = /(?<=title:\s).*/g
                            const sectionArr = Array.from(data.match(rgxSection))
                            const layoutName = data.match(rgxLayout)
                            const titleName = data.match(rgxTitle)
                            socket.emit('currentPageData', sectionArr, layoutName, titleName)
                        },
                        pagesDeletePage: function(nameFile) {
                            fs.unlinkSync(`dist/${nameFile}.html`)
                            fs.unlinkSync(`src/pages/${nameFile}.hbs`)
                        },
                        pagesSavePage: function(nameFile, data) {
                            fs.writeFileSync(`src/pages/${nameFile}.hbs`, data)
                        },
                        readSectionData: function(nameFile) {
                            const data = JSON.parse(fs.readFileSync(`src/blockit/data/sections/${nameFile}.json`, { encoding: 'utf8', flag: 'r' }))
                            socket.emit('processContentData', data)
                        },
                        createContentHbs: function(data) {
                            data.forEach(section => {
                                if(section !== null) {
                                    const nameFile = section.blocks[0].id
                                    fs.writeFileSync(`src/blockit/data/sections/${nameFile}.json`, JSON.stringify(section, null, 2))
                                }
                            })
                        },
                        // post editor
                        postsListPosts: function() {
                            fs.readdir('src/data/posts', (err, files) => {
                                if(err) return console.log(err)
                                const filesInfo = files.filter(item => item)
                                const pagesObj = {data: []}
                                filesInfo.forEach(file => {
                                    let data = JSON.parse(fs.readFileSync(`src/data/posts/${file}`, {encoding:'utf8', flag:'r'}))
                                    const dataPosts = {
                                        title: data.title,
                                        date: data.time,
                                        author: data.author,
                                        category: data.category
                                    }
                                    pagesObj.data.push(dataPosts)
                                })
                                socket.emit('listPostData', pagesObj)
                            })
                        },
                        postPaginatorWidget: function(items, current_page, per_page_items, settingData) {
                            let page = current_page || 1,
                            per_page = per_page_items || 10,
                            offset = (page - 1) * per_page,

                            paginatedItems = items.slice(offset).slice(0, per_page_items),
                            total_pages = Math.ceil(items.length / per_page);

                            return {
                                page: page,
                                per_page: per_page,
                                prev_page: page - 1 ? page - 1 : null,
                                next_page: (total_pages > page) ? page + 1 : null,
                                total_post: items.length,
                                total_pages: total_pages,
                                display_author: settingData.blog.displayAuthor,
                                data: paginatedItems
                                
                            }
                        },
                        postPaginatorPage: function(postObj, dataTag) {
                            // post per page in settings page
                            const settingData = JSON.parse(fs.readFileSync('src/blockit/data/setting.json', { encoding: 'utf8', flag: 'r' }))

                            // read and send post list data
                            setTimeout(() => {
                                const displayPost = settingData.blog.postPerPage
                                const dataSend = blockit.postPaginatorWidget(postObj.post, 1, displayPost, settingData)
                                const totalPages = dataSend.total_pages

                                // blog.js preparation
                                const firstRawTag = postObj.post.map((e) => e.tags)
                                const secondRawTag = []
                                firstRawTag.forEach(item => item.forEach(eachTag => secondRawTag.push(eachTag)))
                                const tagLists = secondRawTag.filter((item, pos) => secondRawTag.indexOf(item) == pos)

                                const firstRawCategory = postObj.post.map((e) => e.category)
                                const categoryLists = firstRawCategory.filter((item, pos) => firstRawCategory.indexOf(item) == pos)

                                const blogJsObj = {totalPages, tagLists}

                                const blogJs = fs.readFileSync('src/assets/js/blockit/8.blog.js', {encoding:'utf8', flag:'r'})
                                const valueChange = blogJs.replace(/(?<=dataBlog =\s).*/g, JSON.stringify(blogJsObj))

                                if(blogJs !== valueChange) {
                                    fs.writeFileSync('src/assets/js/blockit/8.blog.js', valueChange)
                                }

                                let count = 1
                                while (count <= totalPages) {
                                    // blog page data json
                                    let nameFile = `blog-page-${count}`
                                    let dataRes = blockit.postPaginatorWidget(postObj.post, count, displayPost, settingData)
                                    fs.writeFileSync(`src/data/${nameFile}.json`, JSON.stringify(dataRes, null, 2))

                                    // blog page and section hbs
                                    const pageChange = dataTag.defaultPage.replace(/(?<={{> section-blog-)(.*?)(?= }})/g, count)
                                    fs.writeFileSync(`src/pages/blog/page-${count}.hbs`, pageChange)
                                    const sectionFirstChange = dataTag.defaultSection.replace(/{{#each(.*?).data}}/g, `{{#each blog-page-${count}.data}}`)
                                    const sectionSecondChange = sectionFirstChange.replace(/{{#if(.*?).display_author}}/g, `{{#if @root.blog-page-${count}.display_author}}`)
                                    fs.writeFileSync(`src/partials/sections/blog/section-blog-${count}.hbs`, sectionSecondChange)

                                    count++
                                }

                                // delete unused blog-page-number
                                fs.readdir('src/data/', (err, files) => {
                                    if(err) return console.log(err)
                                    const deleteFiles = files.filter(f => f.match(/(blog-page-)/g))
                                    let startFiles = totalPages + 1
                                    let totalFiles = deleteFiles.length

                                    while (startFiles <= totalFiles) {
                                        if (fs.existsSync(`src/data/blog-page-${startFiles}.json`)) fs.unlinkSync(`src/data/blog-page-${startFiles}.json`)
                                        if (fs.existsSync(`src/pages/blog/page-${startFiles}.hbs`)) fs.unlinkSync(`src/pages/blog/page-${startFiles}.hbs`)
                                        if (fs.existsSync(`dist/blog/page-${startFiles}.html`)) fs.unlinkSync(`dist/blog/page-${startFiles}.html`)

                                        startFiles++
                                    }
                                })

                                // create category post
                                const categoryObj = JSON.parse(fs.readFileSync('src/data/blog.json', {encoding:'utf8', flag:'r'}))
                                const categoryData = []
                                const categoryString = 'const categoryData = []'
                                categoryLists.forEach(item => categoryData.push(blockit.createCategoryPost(categoryObj.post, item)))

                                fs.writeFileSync('src/assets/js/blog/category-data.js', categoryString)
                                const categoryValue = categoryString.replace(/(?<=categoryData =\s).*/g, JSON.stringify(categoryData, null, 2))
                                fs.writeFileSync('src/assets/js/blog/category-data.js', categoryValue)

                                // create tag post
                                const tagObj = JSON.parse(fs.readFileSync(`src/data/blog.json`, {encoding:'utf8', flag:'r'}))
                                const tagData = []
                                const tagString = 'const tagData = []'
                                tagLists.forEach(item => tagData.push(blockit.createTagPost(tagObj.post, item)))
                                tagData.forEach(item => {
                                    item.posts.forEach(e => {
                                        delete e.tags
                                        delete e.blocks
                                    })
                                })

                                fs.writeFileSync('src/assets/js/blog/tag-data.js', tagString)
                                const tagValue = tagString.replace(/(?<=tagData =\s).*/g, JSON.stringify(tagData, null, 2))
                                fs.writeFileSync('src/assets/js/blog/tag-data.js', tagValue)
                            },1000)
                        },
                        createCategoryPost: function(array, categoryName) {
                            const categoryResult = array.filter(post => post.category === categoryName)
                            categoryResult.forEach((post) => {
                                post.content = post.blocks[0].data.text
                                delete post.blocks
                                delete post.share
                                delete post.time
                                delete post.category
                                delete post.tags
                            })

                            return {
                                category: categoryName,
                                totalPost: categoryResult.length,
                                posts : categoryResult
                            }
                        },
                        createTagPost: function(array, tagName) {
                            const tagResult = []
                            array.forEach(post => {
                                post.tags.filter(tag => {
                                    if(tag === tagName) tagResult.push(post)
                                })
                            })

                            tagResult.forEach((post) => {
                                post.content = post.blocks[0].data.text
                                delete post.share
                                delete post.time
                            })

                            return {
                                tag: tagName,
                                totalPost: tagResult.length,
                                posts : tagResult
                            }
                        },
                        postCreatePage: function(dataTag) {
                            // blog post object
                            const oldBlog = fs.readFileSync('src/data/blog.json', { encoding: 'utf8', flag: 'r' })
                            const postObj = { post: [] }

                            // read all post and merge data to blog.json
                            fs.readdir('src/data/posts', (err, files) => {
                                if(err) return console.log(err)
                                files.forEach(file => {
                                    let data = JSON.parse(fs.readFileSync(`src/data/posts/${file}`, { encoding: 'utf8', flag: 'r' }))
                                    postObj.post.push(data)
                                })

                                postObj.post.sort((a, b) => new Date(b.time) - new Date(a.time))

                                if(oldBlog !== JSON.stringify(postObj, null, 2)) {
                                    fs.writeFileSync('src/data/blog.json', JSON.stringify(postObj, null, 2))
                                }
                            })

                            blockit.postPaginatorPage(postObj, dataTag)
                        },
                        postsSaveContent: async function(nameFile, dataPost, dataTag) {
                            await del('dist/blog/*.html')

                            fs.writeFileSync(`src/data/posts/${nameFile}.json`, JSON.stringify(dataPost, null, 2))

                            const sectionSingleChange = dataTag.singleSection.replace(/(post-title)/g, nameFile)
                            fs.writeFileSync(`src/partials/sections/blog/post-title-${nameFile}.hbs`, sectionSingleChange)

                            const sectionPageChange = dataTag.singlePage.replace(/(?<={{> post-title)(.*?)(?= }})/g, `-${nameFile}`)
                            fs.writeFileSync(`src/pages/blog/${nameFile}.hbs`, sectionPageChange)

                            blockit.postCreatePage(dataTag)
                        },
                        postsDeletePost: function(nameFile, dataTag) {
                            fs.unlinkSync(`src/data/posts/${nameFile}.json`)
                            fs.unlinkSync(`src/pages/blog/${nameFile}.hbs`)
                            fs.unlinkSync(`src/partials/sections/blog/post-title-${nameFile}.hbs`)
                            fs.unlinkSync(`dist/blog/${nameFile}.html`)

                            blockit.postCreatePage(dataTag)
                        },
                        postsEditPost: function(nameFile) {
                            const contentData = fs.readFileSync(`src/data/posts/${nameFile}.json`, {encoding:'utf8', flag:'r'})
                            socket.emit('currentPostData', contentData)
                        },
                        // navigation editor
                        navigationSave: function(data) {
                            fs.writeFileSync('src/data/navigation.json', JSON.stringify(data, null, 2))
                        },
                        navigationRead: function() {
                            const navRead = fs.readFileSync('src/data/navigation.json', {encoding:'utf8', flag:'r'})
                            socket.emit('navData', navRead)
                        },
                        navigationListPages: function() {
                            fs.readdir('src/pages', (err, files) => {
                                if(err) return console.log(err)
                                files.forEach(file => file)
                                socket.emit('listPageData', files)
                            })
                        },
                        // editor.js
                        uploadImage: function(buffer, nameFile) {
                            fs.writeFileSync(`dist/img/user/${nameFile}`, buffer)
                        },
                        // settings editor
                        assetsUpload: async function(buffer, nameFile) {
                            await fs.writeFile(`dist/img/user/${nameFile}`, buffer, err => {
                                if(err) return console.log(err)
                            })
                        },
                        saveSettingsData: function(data, dataTag) {
                            // write setting.json file
                            const oldData = fs.readFileSync('src/blockit/data/setting.json', { encoding: 'utf8', flag: 'r' })
                            if(oldData !== JSON.stringify(data, null, 2)) {
                                fs.writeFileSync('src/blockit/data/setting.json', JSON.stringify(data, null, 2))
                            }

                            // colors setting
                            const baseVariables = fs.readFileSync('src/assets/scss/base/base-variables.scss', {encoding:'utf8', flag:'r'})
                            const backgroundColorChange = baseVariables.replace(/(?<=base-container-color\:).*/g, `                     ${data.colors.backgroundColor} !default;`)
                            const primaryColorChange = backgroundColorChange.replace(/(?<=base-primary-color\:).*/g, `                       ${data.colors.primaryColor} !default;`)
                            const secondaryColorChange = primaryColorChange.replace(/(?<=base-secondary-color\:).*/g, `                     ${data.colors.secondaryColor} !default;`)
                            const headingColorChange = secondaryColorChange.replace(/(?<=base-heading-color\:).*/g, `                       ${data.colors.headingColor} !default;`)
                            const bodyTextColorChange = headingColorChange.replace(/(?<=base-font-color\:).*/g, `                          ${data.colors.bodyTextColor} !default;`)
                            const linkColorChange = bodyTextColorChange.replace(/(?<=base-link\:).*/g, `                                ${data.colors.linkColor} !default;`)

                            if(baseVariables !== linkColorChange) {
                                fs.writeFileSync('src/assets/scss/base/base-variables.scss', linkColorChange)
                            }

                            // recreate blog pagination page
                            blockit.postCreatePage(dataTag)

                            // update author and avatar data
                            blockit.updateAuthorData(oldData, data, dataTag)
                        },
                        saveContactEmail: function(data) {
                            const phpFile = fs.readFileSync('dist/sendmail.php', {encoding:'utf8', flag:'r'})
                            const currentEmail = String(phpFile.match(/(?<=emailTo = ).*/g))
                            if(currentEmail !== `"${data}";`) {
                                const emailChange = phpFile.replace(/(?<=emailTo = ).*/g, `"${data}";`)
                                fs.writeFileSync('dist/sendmail.php', emailChange)
                            }
                        },
                        returnSettingsData: function() {
                            const data = JSON.parse(fs.readFileSync('src/blockit/data/setting.json', { encoding: 'utf8', flag: 'r' }))
                            socket.emit('processSettingsData', data)
                        },
                        returnFooterData: function() {
                            const data = JSON.parse(fs.readFileSync('src/blockit/data/footer.json', { encoding: 'utf8', flag: 'r' }))
                            socket.emit('processFooterData', data)
                        },
                        returnComponentsData: function() {
                            const data = JSON.parse(fs.readFileSync('src/blockit/data/component.json', { encoding: 'utf8', flag: 'r' }))
                            socket.emit('processComponentsData', data)
                        },
                        saveSettingsFooter: function(bufferData) {
                            if(Object.keys(bufferData).length !== 0) {
                                fs.writeFileSync('src/blockit/data/footer.json', JSON.stringify(bufferData, null, 2))
                            }
                        },
                        updateAuthorData: function(oldData, newData, dataTag) {
                            const oldAuthor = JSON.parse(oldData).authors
                            const newAuthor = newData.authors

                            // compare author name and avatar data
                            const originalObj = oldAuthor.filter(blockit.utilCompareObj(newAuthor))
                            const updatedObj = newAuthor.filter(blockit.utilCompareObj(oldAuthor))
                            const compareResult = originalObj.concat(updatedObj)

                            // blog post object
                            const postObj = { post: [] }

                            // read all post and merge data to blog.json
                            fs.readdir('src/data/posts', (err, files) => {
                                if(err) return console.log(err)
                                files.forEach(file => {
                                    let data = JSON.parse(fs.readFileSync(`src/data/posts/${file}`, { encoding: 'utf8', flag: 'r' }))
                                    if(compareResult.length !== 0) {
                                        Object.values(data).find(prop => {
                                            if(prop.id === compareResult[0].id && prop.name !== compareResult[1].name) {
                                                prop.name = compareResult[1].name, 
                                                prop.avatar = compareResult[1].avatar
                                            } else if(prop.id === compareResult[0].id && prop.avatar !== compareResult[1].avatar) {
                                                prop.name = compareResult[1].name, 
                                                prop.avatar = compareResult[1].avatar
                                            }
                                        })
                                        fs.writeFileSync(`src/data/posts/${file}`, JSON.stringify(data, null, 2))
                                    }
                                    postObj.post.push(data)
                                })

                                postObj.post.sort((a, b) => new Date(b.time) - new Date(a.time))
                                fs.writeFileSync('src/data/blog.json', JSON.stringify(postObj, null, 2))
                            })

                            blockit.postPaginatorPage(postObj, dataTag)
                        },
                        // components editor
                        saveComponentsData: function(data) {
                            fs.writeFileSync('src/blockit/data/component.json', JSON.stringify(data, null, 2))
                            blockit.saveContactEmail(data.contact.email.address)
                        },
                        // utility
                        utilCompareObj: function(otherArray) {
                            return function(current){
                                return otherArray.filter(function(other){
                                    return other.name == current.name &&
                                        other.email == current.email &&
                                        other.role == current.role &&
                                        other.avatar == current.avatar
                                }).length == 0;
                            }
                        }
                    }

                    // pages editor - pages and sections list
                    socket.on('triggerPageData', data => {
                        blockit.pagesListPages()
                        blockit.pagesListSections()
                    })

                    // pages editor - edit page section data
                    socket.on('editPageData', nameFile => blockit.pagesEditPage(nameFile))

                    // pages editor - save information and page section
                    socket.on('savePageData', (nameFile, data) => blockit.pagesSavePage(nameFile, data))

                    // pages editor - delete page data
                    socket.on('deletePageData', nameFile => blockit.pagesDeletePage(nameFile))

                    // pages editor - read section content json for section html editor
                    socket.on('readContentData', nameFile => blockit.readSectionData(nameFile))

                    // pages editor - write content section hbs file
                    socket.on('saveContentSection', data => blockit.createContentHbs(data))

                    // navigation editor - list current pages to select internal
                    socket.on('triggerNavigationData', data => {
                        blockit.navigationRead()
                        blockit.navigationListPages()
                    })

                    // navigation editor - save navigation data
                    socket.on('saveNavigation', data => blockit.navigationSave(data))

                    // posts editor - posts list
                    socket.on('triggerPostData', data => blockit.postsListPosts())

                    // post editor - save post content data
                    socket.on('savePostContent', (nameFile, dataPost, dataTag) => blockit.postsSaveContent(nameFile, dataPost, dataTag))

                    // post editor - delete post data
                    socket.on('deletePostData', (nameFile, dataTag) => blockit.postsDeletePost(nameFile, dataTag))

                    // post editor - edit post content data
                    socket.on('editPostData', nameFile => blockit.postsEditPost(nameFile))

                    // editor.js - upload image
                    socket.on('editorJsUpload', (buffer, nameFile) => blockit.uploadImage(buffer, nameFile))

                    // settings editor - save settings and footer editor data into json
                    socket.on('sendSettingsData', (data, dataTag, bufferData) => {
                        blockit.saveSettingsData(data, dataTag)
                        blockit.saveSettingsFooter(bufferData)
                    })

                    // settings editor - assets upload process
                    socket.on('assetsProcess', (buffer, nameFile) => {
                        blockit.assetsUpload(buffer, nameFile)
                        .then(result => socket.emit('assetsDone', `http://localhost:3000/img/user/${nameFile}`))
                    })

                    // settings editor - read setting.json for setting-editor.js
                    socket.on('readSettingsData', data => {
                        blockit.returnSettingsData()
                        blockit.returnFooterData()
                    })

                    // components editor - read component.json for component-editor.js
                    socket.on('readComponentsData', data => blockit.returnComponentsData())

                    // components editor - save components data into json
                    socket.on('sendComponentsData', data => blockit.saveComponentsData(data))
                })
            }
        }
    })

    wacthTheme()
}

// browsersync reload
function bsReload() {
    browsersync.reload()
}

// Wacth theme task
function wacthTheme() {
    watch('src/assets/scss/**/*.scss', series(theme.taskCss))
    watch('src/assets/js/**/*.js', series(theme.taskJs))
    watch('src/assets/img/**/*', series(theme.taskImg))
    watch(['src/**/*.hbs', 'src/data/*.json', 'src/blockit/data/sections/*.json', 'src/blockit/data/setting.json', 'src/blockit/data/component.json', 'src/blockit/data/footer.json'], series(theme.taskHtml))
}

// Define gulp build task
task('build', series(theme.taskClean, theme.taskHtml, theme.taskCss, theme.taskJs, theme.taskStatic, theme.taskImg))

// Define gulp editor task
task('blockit', bsServe)

// Define gulp dist minidy task
task('minify', minify.minifyFiles)