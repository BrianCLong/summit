resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "${var.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Lambda error rate for ${var.function_name}"
  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }
  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns
}

resource "aws_cloudwatch_metric_alarm" "throttles" {
  alarm_name          = "${var.function_name}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Lambda throttling for ${var.function_name}"
  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }
  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns
}

resource "aws_cloudwatch_metric_alarm" "duration" {
  alarm_name          = "${var.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Average"
  threshold           = var.timeout * 1000 * 0.8 # 80% of timeout
  alarm_description   = "Lambda duration high for ${var.function_name}"
  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }
  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns
}

resource "aws_cloudwatch_dashboard" "lambda_dashboard" {
  dashboard_name = "${var.function_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.function_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Invocations / Errors / Throttles"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.function_name, { stat = "p95" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.function_name, { stat = "Average" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Duration (p95 & Avg)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          metrics = [
             [ "AWS/Lambda", "ConcurrentExecutions", "FunctionName", var.function_name ]
          ]
          view = "timeSeries"
          stacked = false
          title = "Concurrent Executions"
        }
      }
    ]
  })
}
