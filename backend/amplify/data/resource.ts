import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  SharedCalculation: a
    .model({
      // Creator information
      creatorName: a.string().required(),
      creatorEmail: a.string().required(),
      creatorMobile: a.string().required(),
      
      // Calculation data
      devices: a.json().required(),
      calculations: a.json().required(),
      
      // Sharing and expiration
      shareId: a.string().required(), // Custom short ID for URLs
      expiresAt: a.datetime().required(),
      isActive: a.boolean().required().default(true),
      
      // Future user auth support (optional fields)
      userId: a.string(), // For when user auth is added
      isPublic: a.boolean().default(true), // Public sharing vs private
      
      // Metadata
      title: a.string(), // Optional title for the calculation
      description: a.string(), // Optional description
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      // Future: allow.owner() when user auth is added
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
}); 