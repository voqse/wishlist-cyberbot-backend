import antfu from '@antfu/eslint-config'

export default antfu().overrideRules({
  'antfu/if-newline': null,
  'no-console': null,
  'node/prefer-global/process': null,
})
