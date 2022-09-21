// gulp plugin
const {src, dest} = require('gulp')

// required plugins
const del = require('del')
const panini = require('panini')
const rename = require('gulp-rename')
const beautify = require('gulp-jsbeautifier')
const minify = require('gulp-minifier')
const merge = require('merge-stream')
const newer = require('gulp-newer')
const concat = require('gulp-concat')
const sass = require('gulp-sass')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const shorthand = require('postcss-merge-longhand')
const imagemin = require('gulp-imagemin')
const validator = require('gulp-w3c-html-validator')

// Panini reload cache
async function reloadPanini() {
    await panini.refresh()
}

// Clean dist folder
function taskClean() {
    return del(['dist/**', 'dist/img/*', '!dist/img', '!dist/img/user'])
}

// HTML compile task
function taskHtml() {
    reloadPanini()
    return src('src/pages/**/*.hbs')
    .pipe(panini({
        root: 'src/pages/',
        layouts: 'src/layouts/',
        partials: 'src/partials/',
        helpers: 'src/helpers/',
        data: ['src/data/', 'src/blockit/data/']
    }))
    .pipe(rename(path => path.extname = '.html'))
    .pipe(beautify({
        html: {
            file_types: ['.html'],
            max_preserve_newlines: 0,
            preserve_newlines: true,
        }
    }))
    // .pipe(validator())
    .pipe(dest('dist'))
}

// Css compile task
function taskCss() {
    return merge(
        // uikit.min.css compile task
        src('src/assets/scss/uikit.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename('uikit.min.css'))
        .pipe(beautify({css: {file_types: ['.css']}}))
        .pipe(minify({minify: true, minifyCSS: true}))
        .pipe(dest('dist/css/vendors')),

        // style.css compile task
        src('src/assets/scss/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename('style.css'))
        .pipe(beautify({css: {file_types: ['.css']}}))
        .pipe(postcss([autoprefixer(), shorthand()]))
        .pipe(dest('dist/css'))
    )
}

// Js compile task
function taskJs() {
    return merge(
        // config-theme.js
        src(['src/assets/js/*.js', '!src/assets/js/blockit/*.js'])
        .pipe(newer('dist/js/config-theme.js'))
        .pipe(beautify({js: {file_types: ['.js']}}))        
        .pipe(dest('dist/js')),

        // blockit.min.js
        src('src/assets/js/blockit/*.js')
        .pipe(newer('dist/js/vendors/blockit.min.js'))
        .pipe(concat('blockit.min.js', {newLine: '\r\n\r\n'}))
        .pipe(minify({minify: true, minifyJS: {sourceMap: false}}))
        .pipe(dest('dist/js/vendors')),

        // js blog data
        src('src/assets/js/blog/*.js')
        .pipe(dest('dist/js/blog')),

        // js vendors
        src('src/assets/js/vendors/*.js')
        .pipe(minify({minify: true, minifyJS: {sourceMap: false}}))
        .pipe(dest('dist/js/vendors')),
    )
}

// Image optimization task
function taskImg() {
    return src('src/assets/img/**/*')
    .pipe(newer('dist/img'))
    .pipe(imagemin([
        imagemin.gifsicle({interlaced: true}),
        imagemin.mozjpeg({quality: 80, progressive: true}),
        imagemin.optipng({optimizationLevel: 5}),
        imagemin.svgo({
            plugins: [
                {removeViewBox: true},
                {cleanupIDs: false}
            ]
        })
    ], {
        verbose: false
    }))
    .pipe(dest('dist/img'))
}

// Static assets task
function taskStatic() {
    return merge(
        // webfonts
        src('src/assets/fonts/*')
        .pipe(dest('dist/fonts')),

        // fontAwesome icons
        src([
            'node_modules/@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff',
            'node_modules/@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2',
            'node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff',
            'node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2'
        ])
        .pipe(dest('dist/fonts')),

        // favicon
        src('src/assets/static/favicon.ico')
        .pipe(dest('dist')),

        // apple touch icon
        src('src/assets/static/apple-touch-icon.png')
        .pipe(dest('dist')),

        // sendmail.php
        src('src/assets/php/sendmail.php')
        .pipe(dest('dist')),

        // uikit.min.js
        src('node_modules/uikit/dist/js/uikit.min.js')
        .pipe(dest('dist/js/vendors')),

        // css vendors
        src('src/assets/css/*')
        .pipe(dest('dist/css/vendors'))
    )
}

module.exports = { taskClean, taskHtml, taskCss, taskJs, taskImg, taskStatic }