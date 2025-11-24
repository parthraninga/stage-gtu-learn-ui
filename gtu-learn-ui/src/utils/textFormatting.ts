export const formatTextWithBold = (text: string): string => {
  // First replace **text** with <strong>text</strong>
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Then replace remaining *text* with <strong>text</strong> (but not already processed ones)
  formattedText = formattedText.replace(/(?<!\*)\*([^*<>]+?)\*(?!\*)/g, '<strong>$1</strong>');
  return formattedText;
};

export const shouldShowDiagram = (diagramRepresentation: string | null): boolean => {
  return diagramRepresentation !== null && diagramRepresentation.trim().length > 0;
};