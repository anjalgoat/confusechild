export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN, // e.g. https://your-clerk-domain.clerk.accounts.dev
      applicationID: "convex", // This should usually be "convex"
    },
  ]
};