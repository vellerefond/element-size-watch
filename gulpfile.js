var
	gulp = require('gulp'),
	g = require('gulp-load-plugins')()
;

gulp.task('default', function() {
	return gulp
			.src('./element-size-watch.js')
		.pipe(g.uglify())
		.pipe(g.rename('./element-size-watch.min.js'))
		.pipe(gulp.dest('.'))
});
