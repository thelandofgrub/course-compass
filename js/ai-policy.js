/* =========================================================
   CourseCompass — Zero-Cost AI Policy
   Remote generative AI stays disabled. Device conversation
   remains available without a metered model provider.
   ========================================================= */

globalThis.COURSECOMPASS_AI_POLICY = Object.freeze({
    mode: 'free-tier-only',
    allowBillableUsage: false,
    maximumMonthlyCostUsd: 0,
    remoteGenerativeAI: false,
    fallbackWhenQuotaExhausted: 'device-only'
});
