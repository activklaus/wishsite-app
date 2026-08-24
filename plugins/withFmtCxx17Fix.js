const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Xcode 26.4+'s Clang tightened consteval validation, which the version of the `fmt` pod
// vendored by React Native doesn't satisfy - it fails with "call to consteval function
// '...basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression" (see
// https://github.com/fmtlib/fmt/issues/4740, https://github.com/react/react-native/issues/55601).
// Building just the fmt pod as C++17 skips that code path (consteval doesn't exist pre-C++20)
// without touching the rest of the project's C++20 setup. Runs as a Podfile post_install patch
// since ios/ is regenerated on every prebuild - a direct Podfile edit wouldn't survive that.
module.exports = function withFmtCxx17Fix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');
      const marker = "target.name == 'fmt'";
      if (!contents.includes(marker)) {
        const patch = `
    # Must run after react_native_post_install above - it re-normalizes every pod's C++
    # standard to c++20, which would silently overwrite this if applied earlier.
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |fmt_config|
          fmt_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;
        // Anchored on the closing "  end\nend" of post_install do |installer| ... end
        // (2-space-indented end for post_install, followed by the 0-indented end of the
        // enclosing target block) rather than the start of the block, so this genuinely runs
        // last regardless of what Expo's own post_install steps do before it.
        const closingPattern = /\n  end\nend\n?$/;
        if (closingPattern.test(contents)) {
          contents = contents.replace(closingPattern, `\n${patch}  end\nend\n`);
        } else {
          throw new Error('withFmtCxx17Fix: could not find the expected end of the Podfile post_install block to patch.');
        }
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};
