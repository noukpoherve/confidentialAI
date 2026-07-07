# Changelog

All notable changes to confidential-Agent are documented in this file.


## 0.2.0 (2026-05-28)


### Features

* add Dockerfile and .dockerignore for security-api ([484d2e9](https://github.com/noukpoherve/confidentialAI/commit/484d2e97df8af4996d852fb15bc4a1cfe9cc0fdb))
* add GitHub Actions CI/CD workflows ([fb13d3b](https://github.com/noukpoherve/confidentialAI/commit/fb13d3b1731ee533c2fa36e44dac933bff29c597))
* add GlitchTip error tracking via Sentry SDK across backend and dashboard ([9ca77c1](https://github.com/noukpoherve/confidentialAI/commit/9ca77c184535e5276d8dbb254b3311fecb80cc60))
* add LangGraph orchestration and response validation API ([8a9712f](https://github.com/noukpoherve/confidentialAI/commit/8a9712f69428aaa7bd0ca9adde99b69a02be35d7))
* add multi-browser extension build script ([91b3766](https://github.com/noukpoherve/confidentialAI/commit/91b3766c3bfdc8b8c63cd3b7048aff77d5451bb3))
* add release-it automated versioning ([98ea0cb](https://github.com/noukpoherve/confidentialAI/commit/98ea0cbd6c2b11369aaf563c52a89d81b9dfe43c))
* Added and reinforced authentication system. ([1115b0a](https://github.com/noukpoherve/confidentialAI/commit/1115b0a707be5a3190ce7b7d8171c6df268d839e))
* **admin-dashboard:** add /privacy marketing page (en/fr) ([11293a8](https://github.com/noukpoherve/confidentialAI/commit/11293a8e1cb653352df57bf9791eb5c5473e5a74))
* **admin-dashboard:** add visual test runner and cross-layer scenarios ([1f7129d](https://github.com/noukpoherve/confidentialAI/commit/1f7129d6b03b4e3461127be20412cb4fef16364c))
* **admin-dashboard:** apply Confidential AI brand across app ([f5cb333](https://github.com/noukpoherve/confidentialAI/commit/f5cb333c64e1ea13a1a34878f49ebf769cda1b25)), closes [#5C5](https://github.com/noukpoherve/confidentialAI/issues/5C5)
* **admin-dashboard:** bolder landing — bento block and people section ([f91c11b](https://github.com/noukpoherve/confidentialAI/commit/f91c11b827aa73ad876c6402fc5546c5f4109be0))
* **admin-dashboard:** improve incidents UI and add site health ([8d29161](https://github.com/noukpoherve/confidentialAI/commit/8d291611fcb520677181ef898ddb1a0ca95a36e7))
* **admin-dashboard:** localized marketing site and dashboard under [locale] ([a824496](https://github.com/noukpoherve/confidentialAI/commit/a824496c41093fb8c1038869bc0ab1e22d8d56c2))
* auto-detect install environment and hide backend URL section in production ([a823be0](https://github.com/noukpoherve/confidentialAI/commit/a823be0454ef1ec1c81bc5aa6c030c9caf9b8dc7))
* **browser-extension:** add content moderation toggle and UX wiring ([7997119](https://github.com/noukpoherve/confidentialAI/commit/7997119b90f9e3e24b1d5e149e590f505e9dfa15))
* **browser-extension:** add Tailwind UI and expand options ([0a63f3d](https://github.com/noukpoherve/confidentialAI/commit/0a63f3d4d0195c08bf43b771473407780e50f2bf))
* **browser-extension:** auto-detect dev vs store API presets via management API ([2763928](https://github.com/noukpoherve/confidentialAI/commit/276392842fe1c05a52ced6c90c2644bd3ddc2f6d))
* **browser-extension:** i18n EN/FR, build-target API presets, locale sync ([d626834](https://github.com/noukpoherve/confidentialAI/commit/d6268340791053d2b3f45eeb051836fce14c799f))
* **browser-extension:** scoped host permissions, prod API, health check ([7aa5bda](https://github.com/noukpoherve/confidentialAI/commit/7aa5bda51c82fde6185858a7170110b43e23a96e))
* **browser-extension:** universal interception for custom platforms ([6623698](https://github.com/noukpoherve/confidentialAI/commit/66236987dda7df6d05b3978abbc2172dbbaadafc))
* **browser-extension:** use brand logo for toolbar and popup ([36a7c2b](https://github.com/noukpoherve/confidentialAI/commit/36a7c2b3b4018dbe0e53a222d157f1895ceda058))
* extension site configs, protected URLs API, landing download CTAs ([92e3b22](https://github.com/noukpoherve/confidentialAI/commit/92e3b22004a1a84ea09d2b145c0f698e9190eb01))
* **extension:** add image upload moderation before send ([57e1e8f](https://github.com/noukpoherve/confidentialAI/commit/57e1e8f0fb6d10309ddda2128b97811eda337752))
* **extension:** apply surgical redaction to AI responses ([7064b01](https://github.com/noukpoherve/confidentialAI/commit/7064b01442e09fe3eac6542d95cec0efa24d04c0))
* **extension:** expand options UI and sync user settings ([a267380](https://github.com/noukpoherve/confidentialAI/commit/a267380ff3f33481912f887ba6cf2363911ccc0b))
* **extension:** support SUGGEST_REPHRASE and align shared types ([b16a400](https://github.com/noukpoherve/confidentialAI/commit/b16a40030ce0d7acf6cbb113b5d72ca3e5387c3a))
* **extension:** validate AI responses and harden interception ([bb1c890](https://github.com/noukpoherve/confidentialAI/commit/bb1c890a4c138351cbd30f3ee97b1b138051e1a4))
* prompt container resolution, image moderation reliability, tests ([e77176f](https://github.com/noukpoherve/confidentialAI/commit/e77176f3e75e5c649d76cceb25cbc0d6d65eb472))
* **security-api:** add auth APIs and strengthen policy and LLM stack ([1e9253a](https://github.com/noukpoherve/confidentialAI/commit/1e9253a5158d107955eaff0b35a0ce798782ddba))
* **security-api:** add image moderation endpoint ([70049c0](https://github.com/noukpoherve/confidentialAI/commit/70049c0082b277ec0fd91bbf2269331c9c565dc7))
* **security-api:** add optional LLM classifier to LangGraph ([4cd5eb8](https://github.com/noukpoherve/confidentialAI/commit/4cd5eb83c8b102d39c18f9cb019e481d654e0e08))
* **security-api:** add toxicity analyzer and strengthen detection ([839cd09](https://github.com/noukpoherve/confidentialAI/commit/839cd09839c62663d8bc291d1a1c7fbcdac7ad1b))
* **security-api:** extend deterministic sensitive-content detection ([3d3f08f](https://github.com/noukpoherve/confidentialAI/commit/3d3f08f40c12743fdcdec168cf551f90adf97a8b))
* **security-api:** extend user settings schema and storage ([72151f5](https://github.com/noukpoherve/confidentialAI/commit/72151f50df38e0a2dfe7c5e1ea8ef19199db25d2))
* **security-api:** NER spaCy post-analyse AFE avec filtres PER/PERSON ([6291b69](https://github.com/noukpoherve/confidentialAI/commit/6291b69137a57980fb3cf1ed1f65ee315d9c6a81))
* **security-api:** NER spaCy post-analyse AFE avec filtres PER/PERSON ([9012b61](https://github.com/noukpoherve/confidentialAI/commit/9012b612bcb2d84d5f038666b7eea343a99c0976))
* **security-api:** Qdrant vector search path and LangGraph hook ([c9530ef](https://github.com/noukpoherve/confidentialAI/commit/c9530ef38c4736c2c5028ad7dc0f363d8dd2de53))
* **security-api:** réduire faux positifs SWIFT/BIC (CERTAINS, contexte code) ([61a28ee](https://github.com/noukpoherve/confidentialAI/commit/61a28ee3cc80ee4d3e5a76a1a08277dda9f0442d))
* **security-api:** réduire faux positifs SWIFT/BIC (CERTAINS, contexte code) ([a5da842](https://github.com/noukpoherve/confidentialAI/commit/a5da842169ed5cc630abf9a1101cd132fbb540bd))
* **security-api:** spaCy PhraseMatcher LEGAL_HR et spans sur les hits ([e7c4d08](https://github.com/noukpoherve/confidentialAI/commit/e7c4d0886aa58e0443678ce424b041183391c6b7))
* **security:** scope AVS to harmful content and add universal response moderation controls ([09a378b](https://github.com/noukpoherve/confidentialAI/commit/09a378bc246f8c2adc95eb828847c92c098ddf85))


### Bug Fixes

* Added sentry package in dashbord ([96a4410](https://github.com/noukpoherve/confidentialAI/commit/96a4410e2f863193e887781babe7c00acf87db8c))
* **browser-extension:** appliquer le texte redacté aux composeurs React/Lexical avant renvoi ([cd7e85e](https://github.com/noukpoherve/confidentialAI/commit/cd7e85e6568fa936d4dc5f1af151b8695230a5bb))
* **ci:** sync package-lock.json after adding @vitest/coverage-v8 ([626afd0](https://github.com/noukpoherve/confidentialAI/commit/626afd06d5b8620d8df700e79f1efb8b5630036c)), closes [#6](https://github.com/noukpoherve/confidentialAI/issues/6)
* correct ci.yml Python install and env var names ([e2a8916](https://github.com/noukpoherve/confidentialAI/commit/e2a8916b19a7debb2c87fb8d7eba402b9a1c50a3))
* **ext:** awareness copy via i18n; rephrase modal order ([c01900c](https://github.com/noukpoherve/confidentialAI/commit/c01900c891aa3fd6564cf44528ecadcc4b480027))
* **extension:** remove unused scripting permission (Chrome Web Store rejection) ([12f7c81](https://github.com/noukpoherve/confidentialAI/commit/12f7c81bf8d88c9da788c35a737fab645bbfec8b))
* fix 3 CI test failures — auth on /incidents, stub offset arg, graph trace assertion ([37836cb](https://github.com/noukpoherve/confidentialAI/commit/37836cb5aaf8562ec648d003c233ba0c4a2f8d08))
* fixed homepage redirection issue ([6e37e10](https://github.com/noukpoherve/confidentialAI/commit/6e37e10f328cd15b80aeccd07546dfc9fd14d7c3))
* Fixed nextjs linter issues. ([0db1191](https://github.com/noukpoherve/confidentialAI/commit/0db1191a495583e41869cda6dfaf294915ee9d93))
* **koyeb:** force add .python-version for buildpack ([3f65461](https://github.com/noukpoherve/confidentialAI/commit/3f65461d6186392b6eca438d0ca1ad0741e96437))
* persist API presets, richer /health, Next route types path ([bcd2701](https://github.com/noukpoherve/confidentialAI/commit/bcd270191bb87096d9b0c046cbb2aee92ea6ce56))


### Performance Improvements

* Improved anonymisation system by adding GLiNER. ([c99d8cf](https://github.com/noukpoherve/confidentialAI/commit/c99d8cf37188b7bcb680a791fb6f8c2cd4d823fb))
* Improved code and system ([a562010](https://github.com/noukpoherve/confidentialAI/commit/a56201038409f316d64e719f532c9b03a52fb38c))

# Changelog

All notable changes to confidential-Agent are documented in this file.
