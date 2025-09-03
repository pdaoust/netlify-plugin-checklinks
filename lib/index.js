const TapRender = require('@munter/tap-render');
const hyperlink = require('hyperlink');
const spot = require('tap-spot');
const globby = require('globby');
const regexpEscape = typeof RegExp.escape == "undefined"
  ? require('regexp.escape')
  : RegExp.escape;

const canonicalRoot = process.env.URL;

module.exports = {
  onPostBuild: async ({
    constants: { PUBLISH_DIR },
    inputs: {
      entryPoints,
      skipPatterns,
      todoPatterns,
      skipFragmentPatterns,
      todoRegexPatterns,
      todoServerErrorPatterns,
      checkExternal,
      redirects,
      pretty,
      timeout,
      concurrency,
      ...defaultInputs
    },
    utils: {
      build: { failBuild },
    },
  }) => {
    /** @type {string} */
    const root = PUBLISH_DIR;

    const regexRegex = /^`([^`]+)`([dimsuv]*)$/;

    const patternToRegex = (pattern) => {
      if ((bits = pattern.match(regexRegex)) != null) {
        return new RegExp(bits[1], bits[2]);
      } else {
        return new RegExp(regexpEscape(pattern));
      }
    };

    const skipPatternsAsRegex = skipPatterns.map(patternToRegex);

    /** @type {FilterFunction} */
    const skipFilter = (report) =>
      Object.values(report).some((value) =>
        skipPatternsAsRegex.some((pattern) => pattern.test(value))
      );

    const skipFragmentPatternsAsRegex = skipFragmentPatterns.map(patternToRegex);

    /** @type {FilterFunction} */
    const skipFragmentFilter = (report) =>
      Object.values(report).some((value) =>
        skipFragmentPatternsAsRegex.some((pattern) => pattern.test(value))
      );

    const todoPatternsAsRegex = todoPatterns.map(patternToRegex);

    /** @type {FilterFunction} */
    const todoFilter = (report) =>
      Object.values(report).some((value) =>
        todoPatternsAsRegex.some((pattern) => pattern.test(value))
      );

    const todoServerErrorPatternsAsRegex = todoServerErrorPatterns.map(patternToRegex);

    /** @type {FilterFunction} */
    const todoServerErrorsFilter = (report) =>
      Object.values(report).some((value) =>
        todoServerErrorPatternsAsRegex.some((pattern) => pattern.test(value))
      );

    const t = new TapRender();

    if (pretty) {
      t.pipe(spot()).pipe(process.stdout);
    } else {
      t.pipe(process.stdout);
    }

    await hyperlink(
      {
        inputUrls: globby.sync(entryPoints, { cwd: root }),
        ...defaultInputs,
        canonicalRoot,
        root,
        skipFilter,
        skipFragmentFilter,
        todoFilter,
        todoServerErrorsFilter,
        internalOnly: !checkExternal,
        redirects,
        pretty: true,
        timeout,
        concurrency,
      },
      t
    );

    const results = t.close();

    if (results.fail) {
      return failBuild('Links checking failed');
    }

    return results;
  },
};
