import shap


def attach_shap(model, feature_frame, metadata):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(feature_frame)
    return [
        {
            **meta,
            "shap": values.tolist(),
            "top_attribution": sorted(
                zip(feature_frame.columns, values),
                key=lambda pair: abs(pair[1]),
                reverse=True
            )[:3]
        }
        for meta, values in zip(metadata, shap_values)
    ]
