'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-sm rounded ${
        active
          ? 'bg-primary-600 text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [mode, setMode] = useState<'richtext' | 'html'>('richtext');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
      Image,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (mode === 'richtext' && editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const html = ev.target?.result as string;
      if (html) {
        // Extract <body> content if full HTML document, otherwise use as-is
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const bodyHtml = bodyMatch ? bodyMatch[1].trim() : html;
        setMode('html');
        onChange(bodyHtml);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const switchToRichText = () => {
    setMode('richtext');
    if (editor) {
      editor.commands.setContent(content);
    }
  };

  const switchToHtml = () => {
    setMode('html');
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Mode tabs + toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 mr-2">
          <button
            type="button"
            onClick={switchToRichText}
            className={`px-2.5 py-1 text-xs font-medium rounded-l-md ${
              mode === 'richtext'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Rich Text
          </button>
          <button
            type="button"
            onClick={switchToHtml}
            className={`px-2.5 py-1 text-xs font-medium rounded-r-md ${
              mode === 'html'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            HTML
          </button>
        </div>

        {mode === 'richtext' && editor && (
          <div className="flex flex-wrap gap-1 items-center">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
              <u>U</u>
            </ToolbarButton>
            <span className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading">
              H2
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
              List
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
              1.
            </ToolbarButton>
            <span className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
              Left
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
              Center
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
              Right
            </ToolbarButton>
            <span className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add link">
              Link
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Add image">
              Img
            </ToolbarButton>
            <span className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <input
              type="color"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="w-7 h-7 rounded cursor-pointer border-0"
              title="Text color"
            />
          </div>
        )}

        {/* Upload HTML - always visible */}
        <div className="ml-auto">
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload HTML file">
            Upload HTML
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleHtmlUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Editor area */}
      {mode === 'richtext' ? (
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none p-4 min-h-[200px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[180px]"
        />
      ) : (
        <div className="flex flex-col">
          {/* HTML source textarea */}
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-4 min-h-[200px] font-mono text-sm bg-gray-900 text-green-400 border-0 outline-none resize-y"
            spellCheck={false}
          />
          {/* Live preview */}
          {content && (
            <div className="border-t border-gray-300 dark:border-gray-600">
              <p className="px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                Preview
              </p>
              <div
                className="p-4 bg-white max-h-[300px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
