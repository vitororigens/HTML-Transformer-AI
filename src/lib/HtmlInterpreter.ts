import { parse } from 'node-html-parser';
import { Groq } from "groq-sdk";

export interface DepartmentRules {
  name: string;
  prompt: string;
}

interface ProcessedUrl {
  original: string;
  new: string;
}

export class HtmlInterpreter {
  private groq: Groq;
  private rules: Map<string, DepartmentRules>;
  private domains: string[];
  private debugOutput: string;
  private urlsProcessed: ProcessedUrl[];
  private urlsNormalized: number;

  constructor() {
    this.groq = new Groq({
      apiKey: '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',
      dangerouslyAllowBrowser: true
    });
    this.rules = new Map();
    this.domains = ["saude.df.gov.br", "10.242.0.138:8443", "/documents", "/wp-content", "/wp-conteudo"];
    this.debugOutput = "";
    this.urlsProcessed = [];
    this.urlsNormalized = 0;
    this.initializeDefaultRules();
  }

  private debug(message: string, value: string): string {
    this.debugOutput += `${message}: ${value}\n`;
    return value;
  }

  private extractFileName(url: string): string {
    const segments = url.split("/");
    for (const segment of segments.reverse()) {
      if (segment.includes(".") && !segment.includes("?")) {
        return this.debug("extractFileName-result", segment);
      }
    }
    return this.debug("extractFileName-fallback", "");
  }

  private removeUrlParams(url: string): string {
    if (url.includes("?")) {
      return this.debug("removeUrlParams", url.substring(0, url.indexOf("?")));
    }
    return this.debug("removeUrlParams-noparams", url);
  }

  private getExtension(filename: string): string {
    if (filename.includes(".")) {
      const ext = filename.substring(filename.lastIndexOf("."));
      const hyphenExt = "-" + ext.substring(1);
      return this.debug("getExtension", hyphenExt);
    }
    return this.debug("getExtension-noext", "");
  }

  private normalizeSpecialChars(text: string): string {
    const replacements: Record<string, string> = {
      "%C3%A7": "c", "%C3%A3": "a", "%C3%B5": "o", "%C3%A1": "a",
      "%C3%A9": "e", "%C3%AD": "i", "%C3%B3": "o", "%C3%BA": "u",
      "%C3%A0": "a", "%C3%A2": "a", "%C3%AA": "e", "%C3%AE": "i",
      "%C3%B4": "o", "%C3%BB": "u", "%C3%B1": "n", "%C2%BA": "",
      "%20": "-", "%C3%8A": "E", "%C3%89": "e", "%C2%B0": "",
      "%C3%87": "C", "%C3%95": "O", "%C3%81": "A", "%C3%83": "A",
      "%C3%94": "O", "%C3%8D": "I", "%C3%93": "O", "%C2%AA": "",
      "%E2%80%93": "-", "%CC%81": "", "+": "-"
    };

    let normalized = text.toLowerCase();
    for (const [from, to] of Object.entries(replacements)) {
      normalized = normalized.replace(new RegExp(from, 'g'), to);
    }

    normalized = normalized.replace(/\-{2,}/g, "-");

    return this.debug("normalizeSpecialChars", normalized);
  }


  private adjustFileName(fileName: string): string {
    return this.debug("adjustFileName", fileName.replace(/2$/, "282-29"));
  }

  private normalizeUrl(originalUrl: string, options: {
    normalizeSpecialChars: boolean,
    relativizeLinks: boolean,
    secretaria: string
  }): string {
    this.debug("normalizeUrl-input", originalUrl);

    if (options.relativizeLinks && originalUrl.startsWith("http") && originalUrl.includes(".df.gov.br")) {
      const match = originalUrl.match(/https?:\/\/[^/]+(\/.*)?/);
      if (match && match[1]) {
        return this.debug("normalizeUrl-relatived", match[1]);
      }
    }

    if (originalUrl.includes("info.saude.df.gov.br") || originalUrl.includes("amamentabrasilia.saude.df.gov.br")) {
      return this.debug("normalizeUrl-excepted", originalUrl);
    }

    // Handle /documents/ URLs
    if (originalUrl.includes("/documents/")) {
      const cleanUrl = this.removeUrlParams(originalUrl);
      const fileName = this.extractFileName(cleanUrl);

      if (fileName) {
        const extension = this.getExtension(fileName);
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));

        let normalizedName = options.normalizeSpecialChars ?
          this.normalizeSpecialChars(nameWithoutExt) :
          nameWithoutExt.replace(/[+\s]/g, "-").toLowerCase();

        normalizedName = normalizedName.replace(/\./g, "-");
        normalizedName = this.adjustFileName(normalizedName);

        return this.debug("normalizeUrl-final", `/documents/d/${options.secretaria}/${normalizedName}${extension}`);
      }
    }

    // Handle wp-content URLs
    if (originalUrl.includes("/wp-content/") || originalUrl.includes("/wp-conteudo")) {
      const cleanUrl = this.removeUrlParams(originalUrl);
      const fileName = this.extractFileName(cleanUrl);

      if (fileName) {
        const extension = this.getExtension(fileName);
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));

        let normalizedName = options.normalizeSpecialChars ?
          this.normalizeSpecialChars(nameWithoutExt) :
          nameWithoutExt;

        normalizedName = normalizedName.replace(/\./g, "-");
        normalizedName = this.adjustFileName(normalizedName);

        return this.debug("normalizeUrl-wp", `/documents/d/${options.secretaria}/${normalizedName}${extension}`);
      }
    }

    return this.debug("normalizeUrl-unchanged", originalUrl);
  }

  public async processHtml(html: string, options: {
    secretaria: string,
    normalizeSpecialChars: boolean,
    relativizeLinks: boolean
  }): Promise<{
    processedHtml: string,
    debugOutput: string,
    urlsNormalized: number,
    urlsProcessed: ProcessedUrl[]
  }> {
    this.debugOutput = "";
    this.urlsProcessed = [];
    this.urlsNormalized = 0;

    if (!html) {
      return {
        processedHtml: "",
        debugOutput: this.debugOutput,
        urlsNormalized: 0,
        urlsProcessed: []
      };
    }

    const root = parse(html);

    // Process all links and images
    const elements = root.querySelectorAll('[href], [src]');
    for (const element of elements) {
      const isHref = element.hasAttribute('href');
      const isSrc = element.hasAttribute('src');
      const originalUrl = isHref ? element.getAttribute('href') : element.getAttribute('src');

      if (originalUrl) {
        const newUrl = this.normalizeUrl(originalUrl, options);

        if (originalUrl !== newUrl) {
          this.urlsNormalized++;
          this.urlsProcessed.push({ original: originalUrl, new: newUrl });

          if (isHref) {
            element.setAttribute('href', newUrl);
          }
          if (isSrc) {
            element.setAttribute('src', newUrl);
          }
        }
      }
    }

    // Remove srcset and sizes attributes
    root.querySelectorAll('[srcset]').forEach(el => el.removeAttribute('srcset'));
    root.querySelectorAll('[sizes]').forEach(el => el.removeAttribute('sizes'));

    return {
      processedHtml: root.toString(),
      debugOutput: this.debugOutput,
      urlsNormalized: this.urlsNormalized,
      urlsProcessed: this.urlsProcessed
    };
  }

  private initializeDefaultRules() {
    this.addDepartmentRules({
      name: 'saude',
      prompt: `Você é um especialista em transformação de URLs e acessibilidade para a Secretaria de Saúde.
    
    Sua ÚNICA tarefa é modificar o HTML fornecido da seguinte forma:
    
    1. Normalizar URLs:
       - Para links que contêm "/documents/" com arquivos PDF:
         - Converter para o formato: /documents/d/saude/[nome-do-arquivo] (sem a extensão -pdf)
         - Exemplo: converter "<a href="/documents/37101/0/529%C2%AA+RE.pdf/...">529ª Reunião Extraordinária</a>" para "/documents/d/saude/529-_re"
       - Normalizar caracteres especiais em URLs (converter acentos para versões sem acento)
       - Substituir espaços (_)
       - Substituir símbolos por underscores (_)
       - Se houver uma sequência de múltiplos hífens consecutivos (---- ou ---), substituí-los por um único hífen (-)
       - Se houver uma sequência de múltiplos + consecutivos (+++ ou ++++), substituí-los por um único hífen (-)
    
    2. Adicionar atributos de acessibilidade APENAS para links:
       - Adicionar um atributo aria-label descritivo baseado no conteúdo do link
       - Exemplo: <a href="..." aria-label="Cronograma de reuniões do Conselho de Saúde do Distrito Federal (CSDF) para o ano 2025.">
    
    NÃO modifique outros elementos HTML.
    NÃO altere a estrutura do documento.
    NÃO adicione novos elementos.
    NÃO modifique o conteúdo textual.
    
    Forneça o HTML resultante mantendo exatamente a mesma estrutura, apenas com as URLs normalizadas e aria-labels adicionados aos links.`
    });
  }

  public addDepartmentRules(rules: DepartmentRules) {
    this.rules.set(rules.name, rules);

  }

  public async interpret(html: string, department: string): Promise<string> {
    let rules = this.rules.get(department);

    if (!rules) {
      const departmentName = department.charAt(0).toUpperCase() + department.slice(1);

      rules = {
        name: department,
        prompt: `Você é um especialista em transformação de URLs e acessibilidade para a Secretaria de ${departmentName}.
    
    Sua ÚNICA tarefa é modificar o HTML fornecido da seguinte forma:
    
    1. Normalizar URLs:
       - Para links que contêm "/documents/" com arquivos PDF:
         - Converter para o formato: /documents/d/${department}/[nome-do-arquivo] (sem a extensão -pdf)
         - Exemplo: converter "<a href="/documents/37101/0/529%C2%AA+RE.pdf/...">529ª Reunião Extraordinária</a>" para "/documents/d/${department}/529-_re"
       - Normalizar caracteres especiais em URLs (converter acentos para versões sem acento)
       - Substituir espaços (_)
       - Substituir símbolos por underscores (_)
       - Se houver uma sequência de múltiplos hífens consecutivos (---- ou ---), substituí-los por um único hífen (-)
       - Se houver uma sequência de múltiplos + consecutivos (+++ ou ++++), substituí-los por um único hífen (-)
    
    2. Adicionar atributos de acessibilidade APENAS para links:
       - Adicionar um atributo aria-label descritivo baseado no conteúdo do link
       - Exemplo: <a href="..." aria-label="Cronograma de reuniões do Conselho de ${departmentName} do Distrito Federal (CSDF) para o ano 2025.">
    
    NÃO modifique outros elementos HTML.
    NÃO altere a estrutura do documento.
    NÃO adicione novos elementos.
    NÃO modifique o conteúdo textual.
    
    Forneça o HTML resultante mantendo exatamente a mesma estrutura, apenas com as URLs normalizadas e aria-labels adicionados aos links.`
      };

      // Adiciona as regras à coleção
      this.addDepartmentRules(rules);
    }

    try {
      // Parse HTML first to validate it
      parse(html);

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: rules.prompt
          },
          {
            role: "user",
            content: html
          }
        ],
        model: "mixtral-8x7b-32768",
        temperature: 0.2,
        max_tokens: 2000
      });

      const transformedHtml = completion.choices[0]?.message?.content;

      if (!transformedHtml) {
        throw new Error('Failed to transform HTML');
      }

      // Validate the transformed HTML
      parse(transformedHtml);

      return transformedHtml;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`HTML transformation failed: ${error.message}`);
      }
      throw new Error('HTML transformation failed');
    }
  }
}