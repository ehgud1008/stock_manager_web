/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} code
 * @property {string} message
 * @property {*} data
 */

/**
 * @typedef {Object} StockAnalysisResult
 * @property {string} stockCode
 * @property {string} stockName
 * @property {number} analysisRunId
 * @property {'SWING'|'SHORT_TERM'} analysisMode
 * @property {'READY'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED'} status
 * @property {'PENDING'|'COMPLETE'|'PARTIAL'|'INVALID'} dataQualityStatus
 * @property {string} baseDate
 * @property {number|null} totalScore
 * @property {{status: 'COMPLETE'|'PROVISIONAL'|'UNAVAILABLE', rise: number|null, entry: number|null, risk: number|null, availableFactors: number, totalFactors: number}|null} suitabilityScores V4/V5 SWING only
 * @property {{setupType: string, setupLabel: string, detailCode: string, detailLabel: string, scenarioStatus: string}|null} swingAssessment V5 SWING only
 * @property {string|null} scoreGrade
 * @property {string|null} strategyName
 * @property {'BUY_CANDIDATE'|'WATCH'|'WAIT'|'AVOID'|null} strategyAction
 * @property {number|null} entryFrom
 * @property {number|null} entryTo
 * @property {number[]} targets
 * @property {number|null} stopLoss
 * @property {number|null} historicalSampleCount
 * @property {Array<Object>} factors
 * @property {string[]} reasons
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} PriceCandle
 * @property {string|number} date
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * @typedef {Object} StockPriceSeries
 * @property {string} stockCode
 * @property {'MINUTE'|'DAY'|'WEEK'|'MONTH'} period
 * @property {'SUCCESS'|'INSUFFICIENT_DATA'|'COLLECTION_FAILED'} status
 * @property {string} statusMessage
 * @property {boolean} isLatest
 * @property {string} baseDate
 * @property {string} lastCollectedAt
 * @property {string} source
 * @property {PriceCandle[]} candles
 */

export const API_TYPES_DOCUMENTED = true;
