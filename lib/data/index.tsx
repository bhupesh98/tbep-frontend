import type { GenePropertyMetadata } from '../interface';

export * from './algorithm';
export * from './datatableColumn';
export * from './forceLayoutOptions';
export * from './graphConfig';
export * from './homeData';
export * from './nodeColor';
export * from './nodeSize';
export * from './radialAnalysisOptions';
export * from './team';
/**
 * Default edge color
 * PS: Use rgba color format only for this variable
 */
export const DEFAULT_EDGE_COLOR = 'rgba(197, 197, 197, 1)';

export const HIGHLIGHTED_EDGE_COLOR = 'rgb(255, 0, 0)';
export const FADED_EDGE_COLOR = 'rgb(204, 204, 204)';

export const LLM_MODELS = [
  {
    id: 'nvidia:openai/gpt-oss-120b',
    name: 'GPT-OSS',
    chef: 'OpenAI',
    chefSlug: 'openai',
    providers: ['nvidia'],
  },
  {
    id: 'nvidia:meta/llama-3.3-70b-instruct',
    name: 'Llama 3.3',
    chef: 'Meta',
    chefSlug: 'llama',
    providers: ['nvidia'],
  },
  {
    id: 'nvidia:deepseek-ai/deepseek-r1-0528',
    name: 'DeepSeek R1',
    chef: 'DeepSeek AI',
    chefSlug: 'deepseek-ai',
    providers: ['nvidia'],
  },
] as const;

export const OPENTARGETS_PROPERTY_MAPPING: GenePropertyMetadata[] = [
  {
    name: 'Overall_Association Score',
    description: (
      <>
        Overall score for the association, calculated from the evidence scores. <br /> Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#target-disease-evidence'
          rel='noreferrer'
        >
          Open Targets Evidence Documentation
        </a>
      </>
    ),
  },
  {
    name: 'GWAS Associations',
    description: (
      <>
        It aggregates target-disease relationships supported by significant genome-wide associations (GWAS) in the
        context of other functional genomics data. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#gwas-associations'
          rel='noreferrer'
        >
          GWAS Associations Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Gene Burden',
    description: (
      <>
        It comprises gene–phenotype relationships observed in gene-level association tests using rare variant collapsing
        analyses. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#gene-burden'
          rel='noreferrer'
        >
          Gene Burden Documentation
        </a>
      </>
    ),
  },
  {
    name: 'ClinVar',
    description: (
      <>
        It is an NIH public archive of reports of the relationships among human variations and phenotypes, with
        supporting evidence. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#clinvar'
          rel='noreferrer'
        >
          ClinVar Documentation
        </a>
      </>
    ),
  },
  {
    name: 'GEL PanelApp',
    description: (
      <>
        It is a knowledge base that combines crowdsourced expertise with curation to provide gene–disease relationships.{' '}
        <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#genomics-england-gel-panelapp'
          rel='noreferrer'
        >
          GEL PanelApp Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Gene2phenotype',
    description: (
      <>
        It is produced and curated from the literature by different sets of panels formed by consultant clinical
        geneticists. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#gene2phenotype'
          rel='noreferrer'
        >
          Gene2phenotype Documentation
        </a>
      </>
    ),
  },
  {
    name: 'UniProt literature',
    description: (
      <>
        It provides a large compendium of sequence and functional information at the protein level. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#uniprot-literature'
          rel='noreferrer'
        >
          UniProt Literature Documentation
        </a>
      </>
    ),
  },
  {
    name: 'UniProt curated variants',
    description: (
      <>
        It curates variants supported by publications that are known to alter protein function on disease. <br />
        Learn more:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#uniprot-variants'
          rel='noreferrer'
        >
          UniProt Variants Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Orphanet',
    description: (
      <>
        It is an international network that offers a range of resources to improve the understanding of rare disorders
        of genetic origin. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#orphanet'
          rel='noreferrer'
        >
          Orphanet Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Clingen',
    description: (
      <>
        The Clinical Genome Resource (ClinGen) Gene–Disease Validity Curation aims to evaluate the strength of evidence
        supporting or refuting a claim that variation in a particular gene causes a particular disease. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#clingen'
          rel='noreferrer'
        >
          Clingen Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Cancer Gene Census',
    description: (
      <>
        Cancer Gene Census (CGC) is an effort to catalogue genes which contain mutations that have been causally
        implicated in cancer. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#cancer-gene-census'
          rel='noreferrer'
        >
          Cancer Gene Census Documentation
        </a>
      </>
    ),
  },
  {
    name: 'IntOGen',
    description: (
      <>
        IntOGen is a framework that identifies potential cancer driver genes by analyzing large-scale mutational data
        from sequenced tumour samples and providing a consensus assessment using various methodologies. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#intogen'
          rel='noreferrer'
        >
          IntOGen Documentation
        </a>
      </>
    ),
  },
  {
    name: 'ClinVar (somatic)',
    description: (
      <>
        ClinVar is an NIH public archive that catalogs the relationship between human variations and phenotypes,
        specifically capturing data on somatic variants separate from germline variants. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#clinvar-somatic'
          rel='noreferrer'
        >
          ClinVar Somatic Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Cancer Biomarkers',
    description: (
      <>
        The Cancer Genome Interpreter aims to understand how tumour genome variations affect responses to anti-cancer
        therapies, while the Cancer Biomarkers database provides curated biomarkers of drug sensitivity, resistance, and
        toxicity, classified by cancer type. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#cancer-biomarkers'
          rel='noreferrer'
        >
          Cancer Biomarkers Documentation
        </a>
      </>
    ),
  },
  {
    name: 'ChEMBL',
    description: (
      <>
        ChEMBL is a database of bioactive molecules, including FDA-approved drugs and clinical candidates, with
        information on their indications and pharmacological targets. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#chembl'
          rel='noreferrer'
        >
          ChEMBL Documentation
        </a>
      </>
    ),
  },
  {
    name: 'CRISPR Screens',
    description: (
      <>
        CRISPRbrain is a database for functional genomics screens in differentiated human brain cell types. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#crispr-screens'
          rel='noreferrer'
        >
          CRISPR Screens Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Project Score',
    description: (
      <>
        Project Score is a Wellcome Sanger Institute resource that aims to identify dependencies in cancer cell lines to
        guide precision medicine. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#project-score'
          rel='noreferrer'
        >
          Project Score Documentation
        </a>
      </>
    ),
  },
  {
    name: 'SLAPenrich',
    description: (
      <>
        SLAPenrich (Sample-population Level Analysis of Pathway enrichments) is a novel statistical framework for the
        identification of significantly mutated pathways, at the sample population level, in large cohorts of cancer
        patients. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#slapenrich'
          rel='noreferrer'
        >
          SLAPenrich Documentation
        </a>
      </>
    ),
  },
  {
    name: 'PROGENy',
    description: (
      <>
        PROGENy (Pathway RespOnsive GENes) is a linear regression model that calculates pathway activity estimates based
        on consensus transcriptomic gene signatures obtained from perturbation experiments. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#progeny'
          rel='noreferrer'
        >
          PROGENy Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Reactome',
    description: (
      <>
        The Reactome database curates reaction pathways affected by diseases, providing information on causal
        target-disease links, such as protein-coding mutations or altered expression. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#reactome'
          rel='noreferrer'
        >
          Reactome Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Gene signatures',
    description: (
      <>
        Gene signatures provides information about key driver genes for specific diseases that have been curated from
        Systems Biology analysis. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#gene-signatures'
          rel='noreferrer'
        >
          Gene Signatures Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Europe PMC',
    description: (
      <>
        The EMBL-EBI's Europe PMC enables access to a worldwide collection of life science publications and preprints
        from trusted sources. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#europe-pmc'
          rel='noreferrer'
        >
          Europe PMC Documentation
        </a>
      </>
    ),
  },
  {
    name: 'Expression Atlas',
    description: (
      <>
        The EMBL-EBI Expression Atlas provides a differential expression pipeline aiming to identify genes that are
        differentially expressed in disease vs control samples. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#expression-atlas'
          rel='noreferrer'
        >
          Expression Atlas Documentation
        </a>
      </>
    ),
  },
  {
    name: 'IMPC',
    description: (
      <>
        The genotype–phenotype associations made available by the International Mouse Phenotypes Consortium (IMPC) are
        used to identify models of human disease based on phenotypic similarity scores. <br />
        Learn More:{' '}
        <a
          target='_blank'
          className='underline'
          href='https://platform-docs.opentargets.org/evidence#impc'
          rel='noreferrer'
        >
          IMPC Documentation
        </a>
      </>
    ),
  },
];
