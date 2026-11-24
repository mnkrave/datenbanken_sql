import katex from 'katex';
import { Fragment } from 'react';

interface FormulaBlockProps {
  latex: string;
  label?: string;
}

export function FormulaBlock({ latex, label = 'Algebraischer Ausdruck' }: FormulaBlockProps) {
  const html = katex.renderToString(latex, {
    displayMode: true,
    throwOnError: false,
    strict: false,
    trust: false,
    maxExpand: 500,
  });

  return (
    <figure className="formula-card" aria-label={label}>
      <figcaption className="formula-label">{label}</figcaption>
      <div
        className="formula-math"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}

interface MathTextProps {
  text: string;
}

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string }
  | { kind: 'code'; value: string };

/**
 * Splits prose into plain text, inline LaTeX ($...$), and inline code (`...`).
 */
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\$([^$]+)\$|`([^`]+)`/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ kind: 'text', value: text.slice(lastIdx, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ kind: 'math', value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ kind: 'code', value: match[2] });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIdx) });
  }
  return segments;
}

export function MathText({ text }: MathTextProps) {
  const segments = parseSegments(text);

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          return <Fragment key={idx}>{seg.value}</Fragment>;
        }
        if (seg.kind === 'code') {
          return (
            <code key={idx} className="inline-code">
              {seg.value}
            </code>
          );
        }
        const html = katex.renderToString(seg.value, {
          displayMode: false,
          throwOnError: false,
          strict: false,
          trust: false,
          maxExpand: 500,
        });
        return (
          <span
            key={idx}
            className="inline-math"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </>
  );
}
