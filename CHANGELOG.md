## 0.8.0

- Bump underlying Medusa sdk version

## 0.7.1

- Add coverage for medusa-plugin-reviews, medusa-plugin-content, medusa-plugin-affiliates, and medusa-plugin-analytics

## 0.7.0

- Update tooling to SvelteKit v3-next and widen peer dependency range

## 0.6.0

- createMedusaHandle() is now exported from sveltekit-medusa-sdk/server
- schemas moved to dedicated /schemas path

## 0.5.0

- Reorganize non-remote functions into three folders: /internal, /helpers, and /server. This will enable import of requestContext() from sveltekit-medusa-sdk/server instead of straight from the barrel to avoid rolldown throwing guard errors incorrectly based on incomplete tree-shaking.

## 0.4.1

- Propagate errors on prerender (can be muted by configuring Sveltekit app using the library to warn instead of error on http errors during build)

## 0.4.0

- Allow region id to be passed into getProducts() and getProduct() ti allow prerendering for multi-region stores

## 0.2.0

- Fix workspace package ref in dist

## 0.1.0

- Initial release
