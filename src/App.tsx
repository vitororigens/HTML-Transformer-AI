import  { useState } from 'react';
import { FileText, Loader2, Copy, Check } from 'lucide-react';
import { HtmlInterpreter } from './lib/HtmlInterpreter';

interface Department {
  value: string;
  label: string;
}

const departments: Department[] = [
  { value: "smdf", label: "Secretaria da Mulher" },
  { value: "sedes", label: "Secretaria de Desenvolvimento Social" },
  { value: "segov", label: "Segov" },
  { value: "seec", label: "Economia" },
  { value: "defesacivil", label: "Defesa Civil" },
  { value: "casamilitar", label: "Casa Militar" },
  { value: "esg", label: "Esg" },
  { value: "semob", label: "Semob" },
  { value: "esporte", label: "SELDF" },
  { value: "secec", label: "Secec" },
  { value: "seac", label: "Seac" },
  { value: "sepd", label: "Sepd" },
  { value: "vice", label: "Vice" },
  { value: "sefjdf", label: "Sefjdf" },
  { value: "sema-df", label: "Sema" },
  { value: "educacao", label: "Educação" },
  { value: "so", label: "Obras e Infraestrutura" },
  { value: "sedet", label: "SEDET" },
  { value: "setur", label: "Turismo" },
  { value: "seduh", label: "Seduh" },
  { value: "undf", label: "Universidade" },
  { value: "slu", label: "SLU" },
  { value: "seagri", label: "Seagri" },
  { value: "fhb", label: "FHB" },
  { value: "dflegal", label: "DF Legal" },
  { value: "saude", label: "Saúde" },
  { value: "der", label: "DER" }
];

function App() {
  const [inputHtml, setInputHtml] = useState('');
  const [department, setDepartment] = useState('saude');
  const [outputHtml, setOutputHtml] = useState('');
  const [debugOutput, setDebugOutput] = useState('');
  const [urlsNormalized, setUrlsNormalized] = useState(0);
  const [urlsProcessed, setUrlsProcessed] = useState<Array<{ original: string; new: string }>>([]);
  const [normalizeSpecialChars, setNormalizeSpecialChars] = useState(false);
  const [relativizeLinks, setRelativizeLinks] = useState(false);
  const [debug, setDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const interpreter = new HtmlInterpreter();

  const handleProcess = async () => {
    try {
      setIsLoading(true);
      setOutputHtml('');
      setDebugOutput('');
      setUrlsNormalized(0);
      setUrlsProcessed([]);

      // First process URLs and normalize them
      const { processedHtml, debugOutput, urlsNormalized, urlsProcessed } = 
        await interpreter.processHtml(inputHtml, {
          secretaria: department,
          normalizeSpecialChars,
          relativizeLinks
        });

      // Then use AI to enhance the HTML
      const enhancedHtml = await interpreter.interpret(processedHtml, department);

      setOutputHtml(enhancedHtml);
      setDebugOutput(debugOutput);
      setUrlsNormalized(urlsNormalized);
      setUrlsProcessed(urlsProcessed);
    } catch (error) {
      console.error('Error processing HTML:', error);
      setOutputHtml(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputHtml);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">HTML Transformer AI</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secretaria
              </label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTML Input
              </label>
              <textarea
                className="w-full h-[400px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                value={inputHtml}
                onChange={(e) => setInputHtml(e.target.value)}
                placeholder="Cole o HTML aqui..."
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="normalizeSpecialChars"
                    checked={normalizeSpecialChars}
                    onChange={(e) => setNormalizeSpecialChars(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="normalizeSpecialChars" className="text-sm text-gray-700">
                    Normalizar caracteres especiais
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="relativizeLinks"
                    checked={relativizeLinks}
                    onChange={(e) => setRelativizeLinks(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="relativizeLinks" className="text-sm text-gray-700">
                    Relativizar links
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="debug"
                    checked={debug}
                    onChange={(e) => setDebug(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="debug" className="text-sm text-gray-700">
                    Modo debug
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={isLoading || !inputHtml}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Processar HTML'
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  HTML Processado
                </label>
                <button
                  onClick={copyToClipboard}
                  disabled={!outputHtml}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <pre className="w-full h-[400px] rounded-md bg-gray-50 p-4 overflow-auto font-mono text-sm">
                {outputHtml}
              </pre>
            </div>

            {debug && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Informações de Debug</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">URLs normalizadas: {urlsNormalized}</p>
                  </div>

                  {urlsProcessed.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">URLs Processadas:</h3>
                      <div className="max-h-60 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Original
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nova
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {urlsProcessed.map((url, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                  {url.original}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                  {url.new}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Log de Debug:</h3>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-md overflow-auto max-h-60 text-sm font-mono">
                      {debugOutput}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;