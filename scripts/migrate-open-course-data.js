const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'js', 'data.js');
const source = fs.readFileSync(dataPath, 'utf8');
const startMarker = '    courses: [';
const endMarker = '    /* defaultCourse points to the first course for backward compat */';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0) {
    if (source.includes('courses: Array.isArray(globalThis.CourseCompassBuiltInCourses)')) {
        console.log('Course data migration already applied.');
        process.exit(0);
    }
    throw new Error('Built-in course array start marker was not found.');
}
if (end < 0) throw new Error('Built-in course array end marker was not found.');

const replacement = `    /* ODbL/open-source course snapshot loaded by js/course-data-open.js. */\n    courses: Array.isArray(globalThis.CourseCompassBuiltInCourses) ? globalThis.CourseCompassBuiltInCourses : [],\n\n`;
fs.writeFileSync(dataPath, source.slice(0, start) + replacement + source.slice(end));
console.log(`Removed ${end - start} bytes of unproven embedded course data and linked the licensed snapshot.`);
