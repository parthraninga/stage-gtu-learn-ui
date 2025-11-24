// Utility functions for text formatting used in components
export const formatBoldText = (text: string): string => {
  if (!text) return '';
  
  let formattedText = text;
  
  // Clean up and format mathematical content
  formattedText = formatMathContent(formattedText);
  
  // Format headers (### Header -> proper heading)
  formattedText = formattedText.replace(/^###\s*(.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3 mt-4">$1</h3>');
  formattedText = formattedText.replace(/^##\s*(.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 mt-5">$1</h2>');
  
  // Format bold text - **text** and *text*
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
  formattedText = formattedText.replace(/(?<!\*)\*([^*<>]+?)\*(?!\*)/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
  
  // Format lists
  formattedText = formatLists(formattedText);
  
  // Format line breaks and paragraphs
  formattedText = formattedText.replace(/\n\n+/g, '</p><p class="mb-3">');
  formattedText = '<p class="mb-3">' + formattedText + '</p>';
  
  // Clean up empty paragraphs
  formattedText = formattedText.replace(/<p[^>]*>\s*<\/p>/g, '');
  
  return formattedText;
};

// Format mathematical content for better readability
export const formatMathContent = (text: string): string => {
  if (!text) return '';
  
  let formatted = text;
  
  // Handle inline math expressions ($...$) - convert to proper math formatting with better theme support
  formatted = formatted.replace(/\$([^$]+)\$/g, '<span class="inline-math">$1</span>');
  
  // Handle display math expressions ($$...$$) - convert to centered math
  formatted = formatted.replace(/\$\$([^$]+)\$\$/g, '<div class="display-math">$1</div>');
  
  // Clean up mathematical symbols and notation
  formatted = formatted.replace(/\\mathbf\{([^}]+)\}/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\\text\{([^}]+)\}/g, '$1');
  formatted = formatted.replace(/\\quad/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  formatted = formatted.replace(/\\Rightarrow/g, '⇒');
  formatted = formatted.replace(/\\rightarrow/g, '→');
  formatted = formatted.replace(/\\leftarrow/g, '←');
  formatted = formatted.replace(/\\le/g, '≤');
  formatted = formatted.replace(/\\ge/g, '≥');
  formatted = formatted.replace(/\\ne/g, '≠');
  formatted = formatted.replace(/\\pm/g, '±');
  formatted = formatted.replace(/\\times/g, '×');
  formatted = formatted.replace(/\\div/g, '÷');
  formatted = formatted.replace(/\\alpha/g, 'α');
  formatted = formatted.replace(/\\beta/g, 'β');
  formatted = formatted.replace(/\\gamma/g, 'γ');
  formatted = formatted.replace(/\\delta/g, 'δ');
  formatted = formatted.replace(/\\lambda/g, 'λ');
  formatted = formatted.replace(/\\nabla/g, '∇');
  formatted = formatted.replace(/\\partial/g, '∂');
  formatted = formatted.replace(/\\sum/g, '∑');
  formatted = formatted.replace(/\\int/g, '∫');
  formatted = formatted.replace(/\\infty/g, '∞');
  
  // Clean up extra LaTeX commands
  formatted = formatted.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  formatted = formatted.replace(/\\\\/g, '<br>');
  
  return formatted;
};

// Format numbered and bulleted lists
export const formatLists = (text: string): string => {
  if (!text) return '';
  
  let formatted = text;
  
  // Handle numbered lists (1. item, 2. item, etc.)
  formatted = formatted.replace(/^(\d+\.\s+.+)$/gm, '<li class="mb-2">$1</li>');
  formatted = formatted.replace(/(<li[^>]*>\d+\.\s*)([^<]+)(<\/li>)/g, '$1$2$3');
  
  // Handle bullet points (• item, - item, * item)
  formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '<li class="mb-2">• $1</li>');
  
  // Wrap consecutive list items in proper list containers
  formatted = formatted.replace(/(<li[^>]*>[\s\S]*?<\/li>)(?:\s*<li[^>]*>[\s\S]*?<\/li>)*/g, (match) => {
    return '<ul class="list-none space-y-2 ml-4 mb-4">' + match + '</ul>';
  });
  
  return formatted;
};

// Returns true if text has non-whitespace content
export const hasContent = (text: string | null | undefined): boolean => {
  return Boolean(text && text.toString().trim().length > 0);
};

export const shouldShowDiagram = (diagramRepresentation: string | null | undefined): boolean => {
  return hasContent(diagramRepresentation);
};