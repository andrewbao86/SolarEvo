/* eslint-disable */
// Frontend-accessible GraphQL operations for BESS Calculator
// This is a copy of backend/api/operations.js for reliable import resolution

export const createSharedCalculation = /* GraphQL */ `
  mutation CreateSharedCalculation(
    $creatorName: String!
    $creatorEmail: String!
    $creatorMobile: String!
    $devices: AWSJSON!
    $calculations: AWSJSON!
    $shareId: String!
    $expiresAt: AWSDateTime!
    $title: String
    $description: String
    $userId: String
  ) {
    createSharedCalculation(
      creatorName: $creatorName
      creatorEmail: $creatorEmail
      creatorMobile: $creatorMobile
      devices: $devices
      calculations: $calculations
      shareId: $shareId
      expiresAt: $expiresAt
      title: $title
      description: $description
      userId: $userId
    ) {
      id
      shareId
      createdAt
      expiresAt
      creatorName
      creatorEmail
      creatorMobile
      devices
      calculations
      isActive
      isPublic
      title
      description
      userId
      __typename
    }
  }
`;

export const getSharedCalculationByShareId = /* GraphQL */ `
  query GetSharedCalculationByShareId($shareId: String!) {
    listSharedCalculations(filter: { shareId: { eq: $shareId }, isActive: { eq: true } }) {
      items {
        id
        shareId
        createdAt
        expiresAt
        creatorName
        creatorEmail
        creatorMobile
        devices
        calculations
        isActive
        isPublic
        title
        description
        __typename
      }
    }
  }
`;

export const getSharedCalculation = /* GraphQL */ `
  query GetSharedCalculation($id: ID!) {
    getSharedCalculation(id: $id) {
      id
      shareId
      createdAt
      expiresAt
      creatorName
      creatorEmail
      creatorMobile
      devices
      calculations
      isActive
      isPublic
      title
      description
      userId
      __typename
    }
  }
`;

export const updateSharedCalculation = /* GraphQL */ `
  mutation UpdateSharedCalculation(
    $id: ID!
    $isActive: Boolean
    $title: String
    $description: String
  ) {
    updateSharedCalculation(input: {
      id: $id
      isActive: $isActive
      title: $title
      description: $description
    }) {
      id
      shareId
      isActive
      title
      description
      __typename
    }
  }
`;

export const listSharedCalculations = /* GraphQL */ `
  query ListSharedCalculations(
    $filter: ModelSharedCalculationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSharedCalculations(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        shareId
        createdAt
        expiresAt
        creatorName
        creatorEmail
        creatorMobile
        devices
        calculations
        isActive
        isPublic
        title
        description
        userId
        __typename
      }
      nextToken
      __typename
    }
  }
`;

// Utility query to check if shareId exists (for generating unique IDs)
export const checkShareIdExists = /* GraphQL */ `
  query CheckShareIdExists($shareId: String!) {
    listSharedCalculations(filter: { shareId: { eq: $shareId } }, limit: 1) {
      items {
        id
        shareId
        __typename
      }
    }
  }
`;

// Admin operations
export const adminListSharedCalculations = /* GraphQL */ `
  query AdminListSharedCalculations(
    $filter: ModelSharedCalculationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSharedCalculations(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        shareId
        createdAt
        expiresAt
        creatorName
        creatorEmail
        creatorMobile
        devices
        calculations
        isActive
        isPublic
        title
        description
        userId
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const deactivateSharedCalculation = /* GraphQL */ `
  mutation DeactivateSharedCalculation($id: ID!) {
    updateSharedCalculation(input: {
      id: $id
      isActive: false
    }) {
      id
      shareId
      isActive
      __typename
    }
  }
`;

export const bulkDeactivateSharedCalculations = /* GraphQL */ `
  mutation BulkDeactivateSharedCalculations($ids: [ID!]!) {
    bulkDeactivateSharedCalculations(ids: $ids) {
      success
      deactivatedCount
      errors
    }
  }
`; 