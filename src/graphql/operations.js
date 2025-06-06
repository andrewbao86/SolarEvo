/* eslint-disable */
// GraphQL operations for BESS Calculator

export const createSharedCalculation = /* GraphQL */ `
  mutation CreateSharedCalculation($input: CreateSharedCalculationInput!) {
    createSharedCalculation(input: $input) {
      id
      createdAt
      expiresAt
      creatorName
      isActive
      __typename
    }
  }
`;

export const getSharedCalculation = /* GraphQL */ `
  query GetSharedCalculation($id: ID!) {
    getSharedCalculation(id: $id) {
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
        operatingRanges {
          start
          end
          __typename
        }
        batteryRanges {
          start
          end
          __typename
        }
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

export const updateSharedCalculation = /* GraphQL */ `
  mutation UpdateSharedCalculation($input: UpdateSharedCalculationInput!) {
    updateSharedCalculation(input: $input) {
      id
      isActive
      __typename
    }
  }
`;

export const listSharedCalculations = /* GraphQL */ `
  query ListSharedCalculations($filter: ModelSharedCalculationFilterInput) {
    listSharedCalculations(filter: $filter) {
      items {
        id
        createdAt
        expiresAt
        isActive
        __typename
      }
      __typename
    }
  }
`; 