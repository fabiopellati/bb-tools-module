<?php

namespace Gnc\BbToolsModule;

return [
    'asset_manager'=>[
        'caching'=>[
            'bb-tools-module'=> [
                'cache' => 'Assetic\\Cache\\FilesystemCache',
                'options'=>[
                    'dir'=>__DIR__ . '/../../data/cache/bb_tools_module'
                ]
            ]
        ],
        'resolver_configs' => [
            'map' => [
                'js/bbtools.js' => __DIR__ . '/../public/js/bbtools.js',
                'js/bbtools-min.js' => __DIR__ . '/../public/js/bbtools-min.js',
                'js/bbtools_form.js' => __DIR__ . '/../public/js/bbtools_form.js',
                'js/bbtools_form-min.js' => __DIR__ . '/../public/js/bbtools_form-min.js',
                'js/bbtools_grid.js' => __DIR__ . '/../public/js/bbtools_grid.js',
                'js/bbtools_grid-min.js' => __DIR__ . '/../public/js/bbtools_grid-min.js',
            ],
        ]
    ]
];
