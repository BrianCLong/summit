import React from "react";
import {
  Card as MuiCard,
  CardContent as MuiCardContent,
  CardHeader as MuiCardHeader,
  CardActions as MuiCardActions,
} from "@mui/material";
import { useAccessibility } from "../accessibility/AccessibilityContext";

export const Card = ({ title, children, actions, className = "", ...props }) => {
  const { keyboardNavigation } = useAccessibility();

  const cardProps = { ...props };

  if (keyboardNavigation) {
    cardProps.className = `${props.className || ""} summit-focus-visible`;
  }

  return (
    <MuiCard className={className} {...cardProps}>
      {title && <MuiCardHeader title={title} />}
      <MuiCardContent>{children}</MuiCardContent>
      {actions && <MuiCardActions>{actions}</MuiCardActions>}
    </MuiCard>
  );
};

export const CardContent = MuiCardContent;
export const CardHeader = MuiCardHeader;
export const CardActions = MuiCardActions;
