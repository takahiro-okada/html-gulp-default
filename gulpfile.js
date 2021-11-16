const { src, dest, watch, series, parallel, lastRun } = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssdeclsort = require("css-declaration-sorter");
const gcmq = require("gulp-group-css-media-queries");
const mode = require("gulp-mode")();
const browserSync = require("browser-sync");
const pug = require("gulp-pug");
const webpackStream = require("webpack-stream");
const webpack = require("webpack");
const tinypng = require("gulp-tinypng-extended");
const webp = require("gulp-webp");

const webpackConfig = require("./webpack.config");

const bundleJs = (done) => {
	webpackStream(webpackConfig, webpack)
		.on("error", function (e) {
			console.error(e);
			this.emit("end");
		})
		.pipe(dest("dist/js"));
	done();
};

const compileSass = (done) => {
	const postcssPlugins = [
		autoprefixer({
			grid: "autoplace",
			cascade: false,
		}),
		cssdeclsort({ order: "alphabetical" }),
	];
	src("./src/scss/**/*.scss", { sourcemaps: true })
		.pipe(
			plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
		)
		.pipe(sass({ outputStyle: "expanded" }))
		.pipe(postcss(postcssPlugins))
		.pipe(mode.production(gcmq()))
		.pipe(dest("./dist/css", { sourcemaps: "./sourcemaps" }));
	done();
};

const buildServer = (done) => {
	browserSync.init({
		port: 8080,
		// 静的サイト
		// server: { baseDir: "./" },
		// pug
		server: { baseDir: "./dist" },
		// 動的サイト
		// files: ["./**/*.php"],
		// proxy: "http://localsite.local/",
		open: true,
		watchOptions: {
			debounceDelay: 1000,
		},
	});
	done();
};

const browserReload = (done) => {
	browserSync.reload();
	done();
};

const compilePug = (done) => {
	src(["./src/pug/**/*.pug", "!" + "./src/pug/**/_*.pug"])
		.pipe(
			plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
		)
		.pipe(
			pug({
				pretty: true,
			})
		)
		.pipe(dest("./dist"));
	done();
};

const tinyPng = (done) => {
	src("./src/img/**/*.{png,jpg,jpeg}")
		.pipe(plumber())
		.pipe(
			tinypng({
				key: "zjdTqNZXkGt8v614sNPw2x6hYLhJL1RP",
				sigFile: "./src/img/.tinypng-sigs",
				log: true,
				summarise: true,
				sameDest: true,
				parallel: 10,
			})
		)
		.pipe(dest("./src/img"))
		.on("end", done);
};

const copyImages = (done) => {
	src(["./src/img/**/*"]).pipe(dest("./dist/img")).on("end", done);
};

const generateWebp = (done) => {
	src("./dist/img/**/*.{png,jpg,jpeg}", { since: lastRun(generateWebp) })
		.pipe(webp())
		.pipe(dest("dist/img"));
	done();
};

const watchFiles = () => {
	watch("./src/scss/**/*.scss", series(compileSass, browserReload));
	watch("./src/pug/**/*.pug", series(compilePug, browserReload));
	watch("./src/img/**/*", series(copyImages, generateWebp, browserReload));
	watch("./src/js/**/*.js", series(bundleJs, browserReload));
};

module.exports = {
	sass: compileSass,
	pug: compilePug,
	bundle: bundleJs,
	tinypng: tinyPng,
	webp: generateWebp,
	image: series(tinyPng, generateWebp, copyImages),
	build: series(
		parallel(compileSass, bundleJs, compilePug),
		tinyPng,
		copyImages,
		generateWebp
	),
	default: parallel(buildServer, watchFiles),
};
