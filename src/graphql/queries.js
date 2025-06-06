/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getActiveSharedCalculation = /* GraphQL */ `
  query GetActiveSharedCalculation($id: ID!) {
    getActiveSharedCalculation(id: $id) {
      id
      createdAt
      expiresAt
      creatorName
      creatorEmail
      creatorMobile
      devices {
        name
        power
        quantity
        operatingHours
        batteryHours
        critical
        __typename
      }
      calculations {
        totalEnergy
        batteryCapacity
        recommendedSize
        solarevoRecommendation
        __typename
      }
      isActive
      __typename
    }
  }
`;
