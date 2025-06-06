export const schema = {
    "models": {},
    "enums": {},
    "nonModels": {
        "SharedCalculation": {
            "name": "SharedCalculation",
            "fields": {
                "id": {
                    "name": "id",
                    "isArray": false,
                    "type": "ID",
                    "isRequired": true,
                    "attributes": []
                },
                "createdAt": {
                    "name": "createdAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": true,
                    "attributes": []
                },
                "expiresAt": {
                    "name": "expiresAt",
                    "isArray": false,
                    "type": "AWSDateTime",
                    "isRequired": true,
                    "attributes": []
                },
                "creatorName": {
                    "name": "creatorName",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "creatorEmail": {
                    "name": "creatorEmail",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "creatorMobile": {
                    "name": "creatorMobile",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "devices": {
                    "name": "devices",
                    "isArray": true,
                    "type": {
                        "nonModel": "DeviceInput"
                    },
                    "isRequired": true,
                    "attributes": [],
                    "isArrayNullable": false
                },
                "calculations": {
                    "name": "calculations",
                    "isArray": false,
                    "type": {
                        "nonModel": "CalculationResults"
                    },
                    "isRequired": true,
                    "attributes": []
                },
                "isActive": {
                    "name": "isActive",
                    "isArray": false,
                    "type": "Boolean",
                    "isRequired": true,
                    "attributes": []
                }
            }
        },
        "DeviceInput": {
            "name": "DeviceInput",
            "fields": {
                "name": {
                    "name": "name",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "power": {
                    "name": "power",
                    "isArray": false,
                    "type": "Float",
                    "isRequired": true,
                    "attributes": []
                },
                "quantity": {
                    "name": "quantity",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": true,
                    "attributes": []
                },
                "operatingHours": {
                    "name": "operatingHours",
                    "isArray": false,
                    "type": "Float",
                    "isRequired": true,
                    "attributes": []
                },
                "batteryHours": {
                    "name": "batteryHours",
                    "isArray": false,
                    "type": "Float",
                    "isRequired": true,
                    "attributes": []
                },
                "operatingRanges": {
                    "name": "operatingRanges",
                    "isArray": true,
                    "type": {
                        "nonModel": "TimeRange"
                    },
                    "isRequired": true,
                    "attributes": [],
                    "isArrayNullable": false
                },
                "batteryRanges": {
                    "name": "batteryRanges",
                    "isArray": true,
                    "type": {
                        "nonModel": "TimeRange"
                    },
                    "isRequired": true,
                    "attributes": [],
                    "isArrayNullable": false
                },
                "critical": {
                    "name": "critical",
                    "isArray": false,
                    "type": "Boolean",
                    "isRequired": true,
                    "attributes": []
                }
            }
        },
        "TimeRange": {
            "name": "TimeRange",
            "fields": {
                "start": {
                    "name": "start",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": true,
                    "attributes": []
                },
                "end": {
                    "name": "end",
                    "isArray": false,
                    "type": "Int",
                    "isRequired": true,
                    "attributes": []
                }
            }
        },
        "CalculationResults": {
            "name": "CalculationResults",
            "fields": {
                "totalEnergy": {
                    "name": "totalEnergy",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "batteryCapacity": {
                    "name": "batteryCapacity",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "recommendedSize": {
                    "name": "recommendedSize",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                },
                "solarevoRecommendation": {
                    "name": "solarevoRecommendation",
                    "isArray": false,
                    "type": "String",
                    "isRequired": true,
                    "attributes": []
                }
            }
        }
    },
    "codegenVersion": "3.4.4",
    "version": "f240e83d1151221b0505b92373064852"
};