const TapRender = require('@munter/tap-render');
const hyperlink = require('hyperlink');
const spot = require('tap-spot');
const globby = require('globby');

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
      checkExternal,
      pretty,
      ...defaultInputs
    },
    utils: {
      build: { failBuild },
    },
  }) => {
    /** @type {string} */
    const root = PUBLISH_DIR;

    const regexRegex = /^`([^`])+`([dimsuv]*)$/;

    const patternToRegex = (pattern) => {
      if ((bits = pattern.match(regexRegex)) != null) {
        return new RegExp(bits[1], bits[2]);
      } else {
        return new RegExp(RegExp.escape(pattern));
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
        skipPatternsAsRegex.some((pattern) => pattern.test(value))
      );

    const todoPatternsAsRegex = todoPatterns.map(patternToRegex);

    /** @type {FilterFunction} */
    const todoFilter = (report) =>
      Object.values(report).some((value) =>
        todoPatternsAsRegex.some((pattern) => String(value).includes(pattern))
      );

    const todoFragmentPatternsAsRegex = todoFragmentPatterns.map((pattern) => regexRegex.test(pattern)
      ? new RegExp(pattern)
      : new RegExp(RegExp.escape(pattern))
    );

    /** @type {FilterFunction} */
    const todoFragmentFilter = (report) =>
      Object.values(report).some((value) =>
        skipPatternsAsRegex.some((pattern) => pattern.test(value))
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
        todoFragmentFilter,
        internalOnly: !checkExternal,
        pretty: true,
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
