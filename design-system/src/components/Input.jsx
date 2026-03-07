import React from "react";
import {
  TextField as MuiTextField,
  Select as MuiSelect,
  MenuItem as MuiMenuItem,
  FormControl as MuiFormControl,
  InputLabel as MuiInputLabel,
  FormHelperText as MuiFormHelperText,
} from "@mui/material";
import { useAccessibility } from "../accessibility/AccessibilityContext";

export const TextField = ({
  fullWidth = true,
  variant = "outlined",
  size = "medium",
  "aria-label": ariaLabel,
  ...props
}) => {
  const { keyboardNavigation } = useAccessibility();

  const textFieldProps = {
    fullWidth,
    variant,
    size,
    ...props,
  };

  if (keyboardNavigation) {
    textFieldProps.className = `${props.className || ""} summit-focus-visible`;
  }

  return <MuiTextField {...textFieldProps} />;
};

export const Select = ({ children, "aria-label": ariaLabel, ...props }) => {
  const { keyboardNavigation } = useAccessibility();

  const formControlProps = { ...props };

  if (keyboardNavigation) {
    formControlProps.className = `${props.className || ""} summit-focus-visible`;
  }

  return (
    <MuiFormControl fullWidth variant="outlined" {...formControlProps}>
      <MuiInputLabel>{props.label}</MuiInputLabel>
      <MuiSelect label={props.label} aria-label={ariaLabel}>
        {children}
      </MuiSelect>
    </MuiFormControl>
  );
};

export const Option = ({ value, children }) => {
  return <MuiMenuItem value={value}>{children}</MuiMenuItem>;
};
