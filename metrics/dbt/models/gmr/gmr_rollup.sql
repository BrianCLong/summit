{{ config(materialized='view', tags=['gmr']) }}

SELECT *
FROM metrics.gmr_rollup
